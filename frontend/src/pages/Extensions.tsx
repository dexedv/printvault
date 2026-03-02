import { useEffect, useState } from 'react';
import {
  Title,
  Card,
  Text,
  Stack,
  Group,
  Button,
  Switch,
  Badge,
  SimpleGrid,
  Loader,
  Center,
  TextInput,
  PasswordInput,
  NumberInput,
  Select,
  Modal,
  ActionIcon,
  Tabs,
  Table,
  Divider,
  Alert,
} from '@mantine/core';
import { IconPlug, IconPlus, IconTrash, IconSettings, IconPrinter, IconVideo, IconCloud, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { extensionsApi } from '../api/client';

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  has_config?: boolean;
  config_fields?: string[];
}

interface OctoPrintServer {
  name: string;
  host: string;
  port: number;
  api_key: string;
}

interface BambuPrinter {
  name: string;
  host: string;
  serial: string;
  access_code: string;
  region: string;
}

export default function Extensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('octoprint');

  // OctoPrint state
  const [octoServers, setOctoServers] = useState<OctoPrintServer[]>([]);
  const [octoModalOpen, setOctoModalOpen] = useState(false);
  const [octoForm, setOctoForm] = useState({ name: '', host: '', port: 80, api_key: '' });

  // Bambu state
  const [bambuPrinters, setBambuPrinters] = useState<BambuPrinter[]>([]);
  const [bambuModalOpen, setBambuModalOpen] = useState(false);
  const [bambuForm, setBambuForm] = useState({ name: '', host: '', serial: '', access_code: '', region: 'global' });

  // Timelapse state
  const [timelapseModalOpen, setTimelapseModalOpen] = useState(false);
  const [timelapseForm, setTimelapseForm] = useState({ name: '', frame_interval: 5, fps: 30 });

  // Cloud Print state
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [cloudForm, setCloudForm] = useState({ provider: 'local', api_key: '' });

  useEffect(() => {
    loadExtensions();
    loadOctoServers();
    loadBambuPrinters();
  }, []);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const data = await extensionsApi.list();
      setExtensions(data);
    } catch (err) {
      console.error('Failed to load extensions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOctoServers = async () => {
    try {
      const data = await extensionsApi.getOctoPrintServers();
      setOctoServers(data);
    } catch (err) {
      console.error('Failed to load OctoPrint servers:', err);
    }
  };

  const loadBambuPrinters = async () => {
    try {
      const data = await extensionsApi.getBambuPrinters();
      setBambuPrinters(data);
    } catch (err) {
      console.error('Failed to load Bambu printers:', err);
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

  const addOctoServer = async () => {
    try {
      await extensionsApi.addOctoPrintServer(octoForm);
      setOctoModalOpen(false);
      setOctoForm({ name: '', host: '', port: 80, api_key: '' });
      loadOctoServers();
    } catch (err) {
      console.error('Failed to add OctoPrint server:', err);
    }
  };

  const removeOctoServer = async (name: string) => {
    try {
      await extensionsApi.removeOctoPrintServer(name);
      loadOctoServers();
    } catch (err) {
      console.error('Failed to remove OctoPrint server:', err);
    }
  };

  const addBambuPrinter = async () => {
    try {
      await extensionsApi.addBambuPrinter(bambuForm);
      setBambuModalOpen(false);
      setBambuForm({ name: '', host: '', serial: '', access_code: '', region: 'global' });
      loadBambuPrinters();
    } catch (err) {
      console.error('Failed to add Bambu printer:', err);
    }
  };

  const removeBambuPrinter = async (name: string) => {
    try {
      await extensionsApi.removeBambuPrinter(name);
      loadBambuPrinters();
    } catch (err) {
      console.error('Failed to remove Bambu printer:', err);
    }
  };

  const createTimelapse = async () => {
    try {
      await extensionsApi.createTimelapseSession(timelapseForm);
      setTimelapseModalOpen(false);
      setTimelapseForm({ name: '', frame_interval: 5, fps: 30 });
    } catch (err) {
      console.error('Failed to create timelapse:', err);
    }
  };

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconPlug size={28} />
          <Title order={2}>Erweiterungen</Title>
        </Group>
      </Group>

      {/* Extension Cards */}
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }} spacing="md" verticalSpacing="md">
        {extensions.map((ext) => (
          <Card key={ext.id} padding="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                {ext.id === 'octoprint' && <IconPrinter size={24} />}
                {ext.id === 'bambulab' && <IconPrinter size={24} />}
                {ext.id === 'timelapse' && <IconVideo size={24} />}
                {ext.id === 'cloudprint' && <IconCloud size={24} />}
                <div>
                  <Text fw={500}>{ext.name}</Text>
                  <Badge size="xs" variant="light">v{ext.version}</Badge>
                </div>
              </Group>
              <Switch
                checked={ext.enabled}
                onChange={(e) => toggleExtension(ext.id, e.currentTarget.checked)}
              />
            </Group>
            <Text size="sm" c="dimmed">{ext.description}</Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* Configuration Tabs */}
      <Card padding="md" withBorder>
        <Title order={4} mb="md">Konfiguration</Title>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="octoprint" leftSection={<IconPrinter size={16} />}>
              OctoPrint
            </Tabs.Tab>
            <Tabs.Tab value="bambu" leftSection={<IconPrinter size={16} />}>
              Bambu Lab
            </Tabs.Tab>
            <Tabs.Tab value="timelapse" leftSection={<IconVideo size={16} />}>
              Timelapse
            </Tabs.Tab>
            <Tabs.Tab value="cloudprint" leftSection={<IconCloud size={16} />}>
              Cloud Print
            </Tabs.Tab>
          </Tabs.List>

          {/* OctoPrint Tab */}
          <Tabs.Panel value="octoprint" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text>OctoPrint Server</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setOctoModalOpen(true)}
                >
                  Server hinzufügen
                </Button>
              </Group>

              {octoServers.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  Keine OctoPrint Server konfiguriert
                </Alert>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Host</Table.Th>
                      <Table.Th>Port</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {octoServers.map((server) => (
                      <Table.Tr key={server.name}>
                        <Table.Td>{server.name}</Table.Td>
                        <Table.Td>{server.host}</Table.Td>
                        <Table.Td>{server.port}</Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => removeOctoServer(server.name)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Bambu Lab Tab */}
          <Tabs.Panel value="bambu" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text>Bambu Lab Drucker</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setBambuModalOpen(true)}
                >
                  Drucker hinzufügen
                </Button>
              </Group>

              {bambuPrinters.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  Keine Bambu Lab Drucker konfiguriert
                </Alert>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Serial</Table.Th>
                      <Table.Th>Region</Table.Th>
                      <Table.Th></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {bambuPrinters.map((printer) => (
                      <Table.Tr key={printer.name}>
                        <Table.Td>{printer.name}</Table.Td>
                        <Table.Td>{printer.serial}</Table.Td>
                        <Table.Td>{printer.region}</Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => removeBambuPrinter(printer.name)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Timelapse Tab */}
          <Tabs.Panel value="timelapse" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text>Timelapse Sitzungen</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setTimelapseModalOpen(true)}
                >
                  Neue Sitzung
                </Button>
              </Group>

              <Alert icon={<IconCheck size={16} />} color="green">
                Timelapse ist aktiv. Fotos werden automatisch aufgenommen.
              </Alert>

              <Divider />

              <Text fw={500} size="sm">Einstellungen</Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                <NumberInput
                  label="Bildintervall (Sekunden)"
                  defaultValue={5}
                  min={1}
                  max={60}
                />
                <NumberInput
                  label="FPS"
                  defaultValue={30}
                  min={1}
                  max={60}
                />
                <Select
                  label="Auflösung"
                  defaultValue="1920x1080"
                  data={[
                    { value: '1280x720', label: '720p' },
                    { value: '1920x1080', label: '1080p' },
                    { value: '2560x1440', label: '1440p' },
                  ]}
                />
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* Cloud Print Tab */}
          <Tabs.Panel value="cloudprint" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text>Cloud Print Anbieter</Text>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setCloudModalOpen(true)}
                >
                  Anbieter hinzufügen
                </Button>
              </Group>

              <Alert icon={<IconAlertCircle size={16} />} color="blue">
                Cloud Print ermöglicht das Drucken über Netzwerk-Drucker.
              </Alert>

              <Divider />

              <Text fw={500} size="sm">Verfügbare Anbieter</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Local Network Print</Text>
                      <Text size="xs" c="dimmed">Drucken über lokales Netzwerk</Text>
                    </div>
                    <Badge color="green">Verfügbar</Badge>
                  </Group>
                </Card>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>OctoPrint</Text>
                      <Text size="xs" c="dimmed">Drucken über OctoPrint</Text>
                    </div>
                    <Badge color="green">Verfügbar</Badge>
                  </Group>
                </Card>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* OctoPrint Modal */}
      <Modal
        opened={octoModalOpen}
        onClose={() => setOctoModalOpen(false)}
        title="OctoPrint Server hinzufügen"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Mein OctoPrint"
            value={octoForm.name}
            onChange={(e) => setOctoForm({ ...octoForm, name: e.target.value })}
          />
          <TextInput
            label="Host"
            placeholder="http://192.168.1.100"
            value={octoForm.host}
            onChange={(e) => setOctoForm({ ...octoForm, host: e.target.value })}
          />
          <NumberInput
            label="Port"
            defaultValue={80}
            value={octoForm.port}
            onChange={(value) => setOctoForm({ ...octoForm, port: value || 80 })}
          />
          <PasswordInput
            label="API Key"
            placeholder="API-Schlüssel eingeben"
            value={octoForm.api_key}
            onChange={(e) => setOctoForm({ ...octoForm, api_key: e.target.value })}
          />
          <Button onClick={addOctoServer}>Hinzufügen</Button>
        </Stack>
      </Modal>

      {/* Bambu Modal */}
      <Modal
        opened={bambuModalOpen}
        onClose={() => setBambuModalOpen(false)}
        title="Bambu Lab Drucker hinzufügen"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Mein Bambu"
            value={bambuForm.name}
            onChange={(e) => setBambuForm({ ...bambuForm, name: e.target.value })}
          />
          <TextInput
            label="Host"
            placeholder="192.168.1.100"
            value={bambuForm.host}
            onChange={(e) => setBambuForm({ ...bambuForm, host: e.target.value })}
          />
          <TextInput
            label="Serial"
            placeholder="Seriennummer"
            value={bambuForm.serial}
            onChange={(e) => setBambuForm({ ...bambuForm, serial: e.target.value })}
          />
          <PasswordInput
            label="Access Code"
            placeholder="Zugangscode eingeben"
            value={bambuForm.access_code}
            onChange={(e) => setBambuForm({ ...bambuForm, access_code: e.target.value })}
          />
          <Select
            label="Region"
            defaultValue="global"
            data={[
              { value: 'global', label: 'Global' },
              { value: 'eu', label: 'Europa' },
              { value: 'cn', label: 'China' },
            ]}
            value={bambuForm.region}
            onChange={(value) => setBambuForm({ ...bambuForm, region: value || 'global' })}
          />
          <Button onClick={addBambuPrinter}>Hinzufügen</Button>
        </Stack>
      </Modal>

      {/* Timelapse Modal */}
      <Modal
        opened={timelapseModalOpen}
        onClose={() => setTimelapseModalOpen(false)}
        title="Timelapse Sitzung erstellen"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="Mein Timelapse"
            value={timelapseForm.name}
            onChange={(e) => setTimelapseForm({ ...timelapseForm, name: e.target.value })}
          />
          <NumberInput
            label="Bildintervall (Sekunden)"
            defaultValue={5}
            min={1}
            max={60}
            value={timelapseForm.frame_interval}
            onChange={(value) => setTimelapseForm({ ...timelapseForm, frame_interval: value || 5 })}
          />
          <NumberInput
            label="FPS"
            defaultValue={30}
            min={1}
            max={60}
            value={timelapseForm.fps}
            onChange={(value) => setTimelapseForm({ ...timelapseForm, fps: value || 30 })}
          />
          <Button onClick={createTimelapse}>Erstellen</Button>
        </Stack>
      </Modal>

      {/* Cloud Print Modal */}
      <Modal
        opened={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
        title="Cloud Print Anbieter hinzufügen"
      >
        <Stack>
          <Select
            label="Anbieter"
            data={[
              { value: 'local', label: 'Local Network Print' },
              { value: 'octoprint', label: 'OctoPrint' },
            ]}
            value={cloudForm.provider}
            onChange={(value) => setCloudForm({ ...cloudForm, provider: value || 'local' })}
          />
          <PasswordInput
            label="API Key"
            placeholder="API-Schlüssel eingeben"
            value={cloudForm.api_key}
            onChange={(e) => setCloudForm({ ...cloudForm, api_key: e.target.value })}
          />
          <Button onClick={() => setCloudModalOpen(false)}>Hinzufügen</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
