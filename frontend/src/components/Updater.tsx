import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { Button, Stack, Text, Alert, Group, Progress, Center, Title, ThemeIcon, Divider } from '@mantine/core';
import { IconDownload, IconRefresh, IconAlertCircle, IconCheck } from '@tabler/icons-react';

export default function Updater() {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  const checkForUpdates = async () => {
    setChecking(true);
    setError(null);
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo(update);
      } else {
        setUpdateAvailable(false);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setChecking(false);
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo) return;

    setDownloading(true);
    setDownloadProgress(0);
    try {
      await updateInfo.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setDownloadProgress(0);
        } else if (event.event === 'Progress') {
          const total = event.data.contentLength || 1;
          const downloaded = event.data.chunkLength || 0;
          setDownloadProgress(Math.round((downloaded / total) * 100));
        } else if (event.event === 'Finished') {
          setDownloadProgress(100);
        }
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack gap="md">
      <Title order={4}>Updates</Title>

      <Text size="sm" c="dimmed">
        Automatisch nach Updates suchen, um PrintVault auf dem neuesten Stand zu halten.
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      {!updateAvailable && !error && !checking && (
        <Alert icon={<IconCheck size={16} />} color="green">
          Du hast die neueste Version!
        </Alert>
      )}

      {downloading && (
        <Stack gap="xs">
          <Text size="sm">Update wird heruntergeladen...</Text>
          <Progress value={downloadProgress} animated />
          <Text size="xs" c="dimmed">{downloadProgress}%</Text>
        </Stack>
      )}

      <Group>
        <Button
          onClick={checkForUpdates}
          loading={checking}
          leftSection={<IconRefresh size={16} />}
          variant="light"
        >
          Nach Updates suchen
        </Button>

        {updateAvailable && !downloading && (
          <Button
            onClick={downloadUpdate}
            leftSection={<IconDownload size={16} />}
            color="blue"
          >
            Update herunterladen
          </Button>
        )}
      </Group>

      {updateInfo && (
        <>
          <Divider />
          <Stack gap="xs">
            <Text size="sm" fw={500}>Verfügbares Update:</Text>
            <Text size="sm">Version: {updateInfo.version}</Text>
            <Text size="xs" c="dimmed">{updateInfo.body}</Text>
          </Stack>
        </>
      )}
    </Stack>
  );
}
