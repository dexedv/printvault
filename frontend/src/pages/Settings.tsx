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
  TextInput,
  Select,
  Badge,
  Progress,
  Alert,
} from '@mantine/core';
import { IconRefresh, IconDownload, IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
}

export default function Settings() {
  const [appVersion, setAppVersion] = useState('1.0.0');
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

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(setAppVersion);

      // Listen for update events
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
  }, []);

  const checkForUpdates = async () => {
    if (!window.electronAPI) return;
    setCheckingUpdate(true);
    setUpdateError(null);
    const result = await window.electronAPI.checkForUpdates();
    if (!result) {
      setCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    if (!window.electronAPI) return;
    setDownloading(true);
    setDownloadProgress(0);
    const success = await window.electronAPI.downloadUpdate();
    if (!success) {
      setDownloading(false);
    }
  };

  const installUpdate = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

  return (
    <Stack gap="md">
      <Title order={2}>Einstellungen</Title>

      <Card padding="md" withBorder>
        <Title order={4} mb="md">Allgemein</Title>
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

      <Card padding="md" withBorder>
        <Title order={4} mb="md">Speicher</Title>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={500}>Speicherort</Text>
              <Text size="sm" c="dimmed" style={{ maxWidth: 400 }}>
                %APPDATA%/PrintVault/storage
              </Text>
            </div>
            <Button variant="light" size="sm">
              Ordner öffnen
            </Button>
          </Group>

          <Divider />

          <Group justify="space-between">
            <div>
              <Text fw={500}>Datenbank-Speicherort</Text>
              <Text size="sm" c="dimmed" style={{ maxWidth: 400 }}>
                %APPDATA%/PrintVault/printvault.db
              </Text>
            </div>
            <Button variant="light" size="sm">
              Ordner öffnen
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card padding="md" withBorder>
        <Title order={4} mb="md">Über</Title>
        <Stack gap="sm">
          <Group>
            <Text fw={500}>PrintVault</Text>
            <Badge>v{appVersion}</Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Eine umfassende 3D-Druck-Verwaltungsanwendung.
          </Text>
          <Text size="xs" c="dimmed">
            Erstellt mit Electron, React, FastAPI und SQLite.
          </Text>

          {isElectron && (
            <>
              <Divider my="sm" />

              <Title order={5} mb="xs">Updates</Title>

              {updateError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="sm">
                  {updateError}
                </Alert>
              )}

              {!updateAvailable && !updateReady && !checkingUpdate && (
                <Button
                  variant="light"
                  size="sm"
                  onClick={checkForUpdates}
                >
                  Nach Updates suchen
                </Button>
              )}

              {checkingUpdate && (
                <Text size="sm" c="dimmed">
                  Suche nach Updates...
                </Text>
              )}

              {updateAvailable && !downloading && !updateReady && (
                <Stack gap="xs">
                  <Text size="sm">
                    Neue Version verfügbar: <Text fw={500}>{updateAvailable.version}</Text>
                  </Text>
                  <Button
                    leftSection={<IconDownload size={16} />}
                    onClick={downloadUpdate}
                    size="sm"
                  >
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
                  <Button
                    onClick={installUpdate}
                    size="sm"
                  >
                    Jetzt neu starten und installieren
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Card>

      <Card padding="md" withBorder>
        <Title order={4} mb="md">Entwickler</Title>
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
            Der Backend läuft als separater Prozess. Stellen Sie sicher, dass er läuft, damit die App funktioniert.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
