import { useEffect, useState } from 'react';
import {
  Title,
  Button,
  SimpleGrid,
  Card,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Stack,
  Loader,
  Center,
  Modal,
  TextInput,
  NumberInput,
  Group,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconDotsVertical, IconTrash, IconEdit, IconRefresh, IconPrinter, IconCloud, IconCloudOff } from '@tabler/icons-react';
import { printersApi } from '../api/client';
import LimitExceededModal from '../components/LimitExceededModal';
import type { Printer } from '@shared/types';
import classes from './Printers.module.css';

export default function Printers() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  // Connection status for each printer: true = connected, false = disconnected, null = unknown
  const [connectionStatus, setConnectionStatus] = useState<Record<number, boolean | null>>({});
  const [formData, setFormData] = useState({
    name: '',
    printer_type: 'klipper',
    host: '',
    port: 7125,
    api_key: '',
    webcam_url: '',
  });
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ resource: string; current: number; limit: number }>({ resource: 'printers', current: 0, limit: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadPrinters = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await printersApi.list();
      setPrinters(data);
      // Check connection status for all printers
      checkAllConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPrinters(true);
  };

  const checkAllConnections = async (printerList: Printer[]) => {
    // Check connection status for all printers
    for (const printer of printerList) {
      try {
        const result = await printersApi.connect(printer.id);
        setConnectionStatus(prev => ({ ...prev, [printer.id]: result.connected }));
      } catch {
        setConnectionStatus(prev => ({ ...prev, [printer.id]: false }));
      }
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingPrinter) {
        const updated = await printersApi.update(editingPrinter.id, formData);
        setPrinters(printers.map((p) => (p.id === editingPrinter.id ? updated : p)));
      } else {
        const created = await printersApi.create(formData);
        setPrinters([...printers, created]);
      }
      closeModal();
      resetForm();
    } catch (err: any) {
      // Check if it's a limit error
      if (err.response?.status === 403 && err.response?.data?.detail?.includes('Limit')) {
        const msg = err.response.data.detail;
        const match = msg.match(/bereits (\d+) von maximal (\d+)/);
        setLimitInfo({
          resource: 'printers',
          current: match ? parseInt(match[1]) : printers.length,
          limit: match ? parseInt(match[2]) : 1
        });
        setLimitModalOpen(true);
      } else {
        console.error(err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await printersApi.delete(id);
      setPrinters(printers.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await printersApi.connect(id);
      setConnectionStatus(prev => ({ ...prev, [id]: result.connected }));
      if (result.connected) {
        // Refresh printer data
        loadPrinters();
      }
    } catch (err) {
      setConnectionStatus(prev => ({ ...prev, [id]: false }));
    } finally {
      setTestingId(null);
    }
  };

  const resetForm = () => {
    setEditingPrinter(null);
    setFormData({
      name: '',
      printer_type: 'klipper',
      host: '',
      port: 7125,
      api_key: '',
    });
  };

  const openEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      printer_type: printer.printer_type,
      host: printer.host,
      port: printer.port,
      api_key: '',
    });
    openModal();
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
        <Title order={2}>Drucker</Title>
        <Group gap="sm">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="md"
            onClick={handleRefresh}
            loading={refreshing}
            title="Neu laden"
          >
            <IconRefresh size={20} />
          </ActionIcon>
          <Button leftSection={<IconPlus size={18} />} onClick={() => { resetForm(); openModal(); }}>
            Drucker hinzufügen
          </Button>
        </Group>
      </Group>

      {printers.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md" p="xl">
            <Box className={classes.emptyIcon} style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPrinter size={36} color="#94a3b8" />
            </Box>
            <Text c="dimmed" size="lg">Keine Drucker konfiguriert</Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Ersten Drucker hinzufügen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }} spacing="md" verticalSpacing="md">
          {printers.map((printer) => {
            const isConnected = connectionStatus[printer.id] === true;
            const isDisconnected = connectionStatus[printer.id] === false;
            const statusColor = isConnected ? '#10b981' : isDisconnected ? '#ef4444' : '#94a3b8';

            return (
              <Card key={printer.id} padding={0} withBorder className={classes.card}>
                {/* Colored top bar */}
                <Box style={{
                  height: '6px',
                  background: isConnected ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                    : isDisconnected ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                    : 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)',
                }} />

                <Box p="md">
                  <Group justify="space-between" mb="md">
                    <Group gap="sm">
                      <Box
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: isConnected ? '#ecfdf5' : isDisconnected ? '#fef2f2' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isConnected ? (
                          <IconCloud size={24} color="#10b981" />
                        ) : isDisconnected ? (
                          <IconCloudOff size={24} color="#ef4444" />
                        ) : (
                          <IconPrinter size={24} color="#94a3b8" />
                        )}
                      </Box>
                      <div>
                        <Text fw={600} size="md">{printer.name}</Text>
                        <Badge size="sm" variant="light" color="blue">{printer.printer_type}</Badge>
                      </div>
                    </Group>
                    <Menu shadow="md" width={150} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconRefresh size={16} />}
                          onClick={() => handleTest(printer.id)}
                          loading={testingId === printer.id}
                        >
                          Verbindung testen
                        </Menu.Item>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(printer)}>
                          Bearbeiten
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={16} />}
                          onClick={() => handleDelete(printer.id)}
                        >
                          Löschen
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>

                  {/* Connection info */}
                  <Box
                    p="sm"
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <div
                          className={`${classes.statusDot} ${isConnected ? classes.connected : ''}`}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: statusColor,
                          }}
                          title={isConnected ? 'Verbunden' : isDisconnected ? 'Nicht verbunden' : 'Unbekannt'}
                        />
                        <Text size="sm" c="dimmed">
                          {isConnected ? 'Verbunden' : isDisconnected ? 'Nicht verbunden' : 'Unbekannt'}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {printer.host}:{printer.port}
                      </Text>
                    </Group>
                  </Box>

                  {printer.last_connected && (
                    <Text size="xs" c="dimmed">
                      Zuletzt verbunden: {new Date(printer.last_connected).toLocaleString('de-DE')}
                    </Text>
                  )}
                </Box>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingPrinter ? 'Edit Printer' : 'Add Printer'} centered>
        <Stack>
          <TextInput
            label="Printer Name"
            placeholder="e.g., Ender 3 V2"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextInput
            label="Host"
            placeholder="e.g., 192.168.1.100"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            required
          />
          <NumberInput
            label="Port (optional, default: 7125)"
            placeholder="7125"
            value={formData.port || ''}
            onChange={(v) => setFormData({ ...formData, port: Number(v) || 7125 })}
            min={1}
            max={65535}
          />
          <TextInput
            label="API Key (optional)"
            placeholder="Moonraker API key"
            value={formData.api_key}
            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            type="password"
          />
          <TextInput
            label="Webcam URL (optional)"
            placeholder="e.g., http://192.168.1.100/webcam/?action=stream"
            value={formData.webcam_url}
            onChange={(e) => setFormData({ ...formData, webcam_url: e.target.value })}
          />
          <Text size="xs" c="dimmed">
            Für Klipper-Drucker: Moonraker IP und Port (Standard: 7125).
            API-Schlüssel optional aber empfohlen.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.host}>
              {editingPrinter ? 'Save' : 'Add'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <LimitExceededModal
        opened={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        resource={limitInfo.resource}
        current={limitInfo.current}
        limit={limitInfo.limit}
      />
    </Stack>
  );
}
