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
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

export default function Settings() {
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [darkMode, setDarkMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getVersion().then(setAppVersion);
    }
  }, []);

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
