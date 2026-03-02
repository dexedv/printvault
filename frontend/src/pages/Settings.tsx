import { useEffect, useState } from 'react';
import {
  Title,
  Card,
  Text,
  Stack,
  Group,
  Button,
  Switch,
  Divider,
  Select,
  Badge,
  Progress,
  Alert,
  SimpleGrid,
  Loader,
  Center,
  Box,
  Tabs,
} from '@mantine/core';
import { IconRefresh, IconDownload, IconCheck, IconAlertCircle, IconPlug, IconSettings, IconCopy, IconTrash, IconUser, IconCloud, IconInfoCircle, IconCode, IconList } from '@tabler/icons-react';
import { extensionsApi, slicingApi, systemApi } from '../api/client';

interface UpdateInfo {
  version: string;
  releaseDate: string;
}

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export default function Settings() {
  const [appVersion, setAppVersion] = useState<string>('1.0.2');
  const [darkMode, setDarkMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);

  // Update states
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Extensions state
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [extensionsLoading, setExtensionsLoading] = useState(true);

  // Slicers state
  const [availableSlicers, setAvailableSlicers] = useState<Record<string, string>>({});
  const [slicersLoading, setSlicersLoading] = useState(true);

  // Logs state
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Get version from Tauri or Electron
    const getVersion = async () => {
      try {
        // Try Tauri first
        const { getVersion } = await import('@tauri-apps/api/app');
        const version = await getVersion();
        setAppVersion(version);
      } catch {
        // Fallback to Electron API
        if (window.electronAPI) {
          window.electronAPI.getVersion().then(setAppVersion);
        }
      }
    };
    getVersion();

    if (window.electronAPI) {
      window.electronAPI.on('update:available', (info: UpdateInfo) => {
        setUpdateAvailable(info);
        setCheckingUpdate(false);
      });

      window.electronAPI.on('update:not-available', () => {
        setUpdateAvailable(null);
        setCheckingUpdate(false);
      });

      window.electronAPI.on('update:progress', (progress: { percent: number }) => {
        setDownloadProgress(progress.percent);
      });

      window.electronAPI.on('update:downloaded', () => {
        setDownloading(false);
        setUpdateReady(true);
      });

      window.electronAPI.on('update:error', (error: string) => {
        setUpdateError(error);
        setCheckingUpdate(false);
        setDownloading(false);
      });
    }

    loadExtensions();
    loadSlicers();
    loadLogs();
  }, []);

  const loadExtensions = async () => {
    setExtensionsLoading(true);
    try {
      const data = await extensionsApi.list();
      setExtensions(data);
    } catch (err) {
      console.error('Failed to load extensions:', err);
    } finally {
      setExtensionsLoading(false);
    }
  };

  const loadSlicers = async () => {
    setSlicersLoading(true);
    try {
      const data = await slicingApi.getSlicers();
      setAvailableSlicers(data);
    } catch (err) {
      console.error('Failed to load slicers:', err);
    } finally {
      setSlicersLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await systemApi.getLogs();
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs('Fehler beim Laden der Logs: ' + String(err));
    } finally {
      setLogsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await systemApi.clearLogs();
      setLogs('=== Logs wurden gelöscht ===\n');
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const toggleExtension = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await extensionsApi.enable(id);
      } else {
        await extensionsApi.disable(id);
      }
      loadExtensions();
    } catch (err) {
      console.error('Failed to toggle extension:', err);
    }
  };

  const checkForUpdates = async () => {
    console.log('=== Update Check Started ===');
    console.log('Current app version:', appVersion);

    setCheckingUpdate(true);
    setUpdateError(null);

    try {
      const response = await fetch('https://api.github.com/repos/dexedv/printvault/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'PrintVault'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const latestVersion = data.tag_name?.replace('v', '') || data.name;
        console.log('Latest version:', latestVersion);

        if (latestVersion > appVersion) {
          setUpdateAvailable({
            version: latestVersion,
            releaseDate: data.published_at || new Date().toISOString()
          });
          setCheckingUpdate(false);
          return;
        } else {
          setUpdateError('Du hast bereits die neueste Version');
        }
      }
    } catch (e) {
      console.log('GitHub API check failed:', e);
      setUpdateError('Update-Check fehlgeschlagen');
    }

    setCheckingUpdate(false);
  };

  const downloadUpdate = async () => {
    console.log('Starting download update...');

    // Try Tauri updater first
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setDownloading(true);
        setDownloadProgress(0);
        await update.downloadAndInstall((event: any) => {
          if (event.event === 'Progress') {
            const total = event.data.contentLength || 1;
            const downloaded = event.data.chunkLength || 0;
            setDownloadProgress(Math.round((downloaded / total) * 100));
          }
        });
        return;
      }
    } catch (e) {
      console.log('Tauri updater failed:', e);
    }

    // Fallback: Download from GitHub
    if (updateAvailable) {
      try {
        setDownloading(true);
        const response = await fetch('https://api.github.com/repos/dexedv/printvault/releases/latest', {
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'PrintVault'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const exeAsset = data.assets?.find((asset: any) =>
            asset.name?.includes('setup') || asset.name?.endsWith('.exe')
          );

          if (exeAsset) {
            const downloadUrl = exeAsset.browser_download_url;
            try {
              const { open } = await import('@tauri-apps/plugin-shell');
              setUpdateError('Update wird heruntergeladen...');
              await open(downloadUrl);
              setUpdateError('Update wurde heruntergeladen. Der Installer sollte automatisch starten.');
            } catch {
              window.open(downloadUrl, '_blank');
              setUpdateError('Download gestartet. Bitte führen Sie die heruntergeladene Datei aus.');
            }
          }
        }
      } catch (e) {
        console.log('GitHub download failed:', e);
        window.open('https://github.com/dexedv/printvault/releases', '_blank');
        setUpdateError('Download fehlgeschlagen. Bitte manuell von GitHub herunterladen.');
      }
      setDownloading(false);
    }

    if (window.electronAPI) {
      await window.electronAPI.downloadUpdate();
    }
  };

  const installUpdate = () => {
    if (updateAvailable) {
      window.open('https://github.com/dexedv/printvault/releases', '_blank');
    }
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  const showUpdateSection = true;

  return (
    <Stack gap="md">
      <Title order={2}>Einstellungen</Title>

      <Tabs defaultValue="general">
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconUser size={16} />}>
            Allgemein
          </Tabs.Tab>
          <Tabs.Tab value="updates" leftSection={<IconCloud size={16} />}>
            Updates
          </Tabs.Tab>
          <Tabs.Tab value="slicers" leftSection={<IconCode size={16} />}>
            Slicer
          </Tabs.Tab>
          <Tabs.Tab value="logs" leftSection={<IconList size={16} />}>
            Logs
          </Tabs.Tab>
        </Tabs.List>

        {/* General Tab */}
        <Tabs.Panel value="general" pt="md">
          <Card padding="md" withBorder>
            <Title order={4} mb="md">Allgemeine Einstellungen</Title>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Dunkelmodus</Text>
                  <Text size="sm" c="dimmed">Dunkles Design verwenden</Text>
                </div>
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.currentTarget.checked)}
                />
              </Group>

              <Divider />

              <Group justify="space-between">
                <div>
                  <Text fw={500}>Automatisch mit Druckern verbinden</Text>
                  <Text size="sm" c="dimmed">Beim Start automatisch mit Druckern verbinden</Text>
                </div>
                <Switch
                  checked={autoConnect}
                  onChange={(e) => setAutoConnect(e.currentTarget.checked)}
                />
              </Group>

              <Divider />

              <div>
                <Text fw={500} mb="xs">Standarddrucker</Text>
                <Select
                  placeholder="Standarddrucker auswählen"
                  value={defaultPrinter}
                  onChange={setDefaultPrinter}
                  clearable
                  data={[
                    { value: '1', label: 'Printer 1' },
                  ]}
                  style={{ maxWidth: 300 }}
                />
              </div>
            </Stack>
          </Card>

          <Card padding="md" withBorder mt="md">
            <Title order={4} mb="md">Speicher</Title>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Speicherort</Text>
                  <Text size="sm" c="dimmed">%APPDATA%/PrintVault/storage</Text>
                </div>
                <Button variant="light" size="sm">Ordner öffnen</Button>
              </Group>

              <Divider />

              <Group justify="space-between">
                <div>
                  <Text fw={500}>Datenbank</Text>
                  <Text size="sm" c="dimmed">%APPDATA%/PrintVault/printvault.db</Text>
                </div>
                <Button variant="light" size="sm">Ordner öffnen</Button>
              </Group>
            </Stack>
          </Card>

          <Card padding="md" withBorder mt="md">
            <Group gap="xs" mb="md">
              <IconInfoCircle size={20} />
              <Title order={4}>Über PrintVault</Title>
            </Group>
            <Stack gap="xs">
              <Group>
                <Text fw={500}>PrintVault</Text>
                <Badge>v{appVersion}</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Eine umfassende 3D-Druck-Verwaltungsanwendung.
              </Text>
              <Text size="xs" c="dimmed">
                Erstellt mit Tauri, React, FastAPI und SQLite.
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Updates Tab */}
        <Tabs.Panel value="updates" pt="md">
          <Card padding="md" withBorder>
            <Group gap="xs" mb="md">
              <IconCloud size={20} />
              <Title order={4}>Updates</Title>
            </Group>

            {showUpdateSection && (
              <Stack gap="md">
                {updateError && (
                  <Alert icon={<IconAlertCircle size={16} />} color={updateError.includes('neueste') ? 'green' : 'red'}>
                    {updateError}
                  </Alert>
                )}

                {!updateAvailable && !updateReady && !checkingUpdate && !updateError && (
                  <Button variant="light" onClick={checkForUpdates}>
                    Nach Updates suchen
                  </Button>
                )}

                {checkingUpdate && (
                  <Text size="sm" c="dimmed">Suche nach Updates...</Text>
                )}

                {updateAvailable && !downloading && !updateReady && (
                  <Stack gap="xs">
                    <Text size="sm">
                      Neue Version verfügbar: <Text fw={500}>{updateAvailable.version}</Text>
                    </Text>
                    <Button leftSection={<IconDownload size={16} />} onClick={downloadUpdate}>
                      Update herunterladen
                    </Button>
                  </Stack>
                )}

                {downloading && (
                  <Stack gap="xs">
                    <Text size="sm">Update wird heruntergeladen...</Text>
                    <Progress value={downloadProgress} size="sm" animated />
                    <Text size="xs" c="dimmed">{downloadProgress.toFixed(1)}%</Text>
                  </Stack>
                )}

                {updateReady && (
                  <Stack gap="xs">
                    <Alert icon={<IconCheck size={16} />} color="green">
                      Update bereit zur Installation
                    </Alert>
                    <Button onClick={installUpdate}>
                      Jetzt neu starten und installieren
                    </Button>
                  </Stack>
                )}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Slicers Tab */}
        <Tabs.Panel value="slicers" pt="md">
          <Card padding="md" withBorder>
            <Group gap="xs" mb="md">
              <IconCode size={20} />
              <Title order={4}>Slicer-Einstellungen</Title>
            </Group>

            {slicersLoading ? (
              <Center py="md">
                <Loader size="sm" />
              </Center>
            ) : (
              <Stack gap="md">
                <div>
                  <Text fw={500} mb="xs">Verfügbare Slicer</Text>
                  {Object.keys(availableSlicers).length === 0 ? (
                    <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                      Keine Slicer gefunden. Installieren Sie PrusaSlicer oder Cura.
                    </Alert>
                  ) : (
                    <SimpleGrid cols={3}>
                      {Object.entries(availableSlicers).map(([name, path]) => (
                        <Card key={name} padding="xs" withBorder>
                          <Text fw={500} tt="capitalize">{name}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{path}</Text>
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </div>

                <Divider />

                <Group justify="space-between">
                  <div>
                    <Text fw={500}>Standard-Slicer</Text>
                    <Text size="sm" c="dimmed">Slicer für neue Druckaufträge</Text>
                  </div>
                  <Select
                    placeholder="Slicer auswählen"
                    data={Object.keys(availableSlicers).map(s => ({ value: s, label: s }))}
                    defaultValue="prusaslicer"
                    style={{ width: 180 }}
                  />
                </Group>
              </Stack>
            )}
          </Card>

          <Card padding="md" withBorder mt="md">
            <Group gap="xs" mb="md">
              <IconPlug size={20} />
              <Title order={4}>Erweiterungen</Title>
            </Group>

            {extensionsLoading ? (
              <Center py="md">
                <Loader size="sm" />
              </Center>
            ) : extensions.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">
                Keine Erweiterungen verfügbar
              </Text>
            ) : (
              <Stack gap="sm">
                {extensions.map((ext) => (
                  <Card key={ext.id} padding="sm" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text fw={500}>{ext.name}</Text>
                          <Badge size="xs" variant="light">v{ext.version}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">{ext.description}</Text>
                      </div>
                      <Switch
                        checked={ext.enabled}
                        onChange={(e) => toggleExtension(ext.id, e.currentTarget.checked)}
                      />
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>
        </Tabs.Panel>

        {/* Logs Tab */}
        <Tabs.Panel value="logs" pt="md">
          <Card padding="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>Fehlerprotokoll</Title>
              <Group gap="xs">
                <Button variant="light" size="xs" leftSection={<IconCopy size={14} />} onClick={copyLogs} color={copySuccess ? 'green' : 'blue'}>
                  {copySuccess ? 'Kopiert!' : 'Kopieren'}
                </Button>
                <Button variant="light" size="xs" leftSection={<IconTrash size={14} />} onClick={clearLogs} color="red">
                  Löschen
                </Button>
                <Button variant="light" size="xs" leftSection={<IconRefresh size={14} />} onClick={loadLogs} loading={logsLoading}>
                  Aktualisieren
                </Button>
              </Group>
            </Group>

            <Box
              style={{
                background: '#1e1e1e',
                borderRadius: 8,
                padding: 12,
                maxHeight: 500,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              <Text c="gray.5" style={{ fontFamily: 'monospace' }}>
                {logsLoading ? 'Lade Logs...' : logs || 'Keine Logs verfügbar'}
              </Text>
            </Box>
          </Card>

          <Card padding="md" withBorder mt="md">
            <Group gap="xs" mb="md">
              <IconCode size={20} />
              <Title order={4}>Entwickler</Title>
            </Group>
            <Stack gap="sm">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Backend-Server</Text>
                  <Text size="sm" c="dimmed">http://localhost:8000</Text>
                </div>
                <Button variant="light" size="sm" leftSection={<IconRefresh size={16} />}>
                  Neustarten
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Der Backend läuft als separater Prozess.
              </Text>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
