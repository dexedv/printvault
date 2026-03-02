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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconDotsVertical, IconTrash, IconEdit, IconRefresh } from '@tabler/icons-react';
import { printersApi } from '../api/client';
import type { Printer } from '@shared/types';

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

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const data = await printersApi.list();
      setPrinters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    } catch (err) {
      console.error(err);
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
        <Button leftSection={<IconPlus size={18} />} onClick={() => { resetForm(); openModal(); }}>
          Drucker hinzufügen
        </Button>
      </Group>

      {printers.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Text c="dimmed">Keine Drucker konfiguriert</Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Ersten Drucker hinzufügen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {printers.map((printer) => (
            <Card key={printer.id} padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <div>
                  <Group gap="xs">
                    {/* Connection Status Indicator */}
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: connectionStatus[printer.id] === true ? '#10b981' : connectionStatus[printer.id] === false ? '#ef4444' : '#94a3b8',
                        boxShadow: connectionStatus[printer.id] === true ? '0 0 6px #10b981' : 'none',
                      }}
                      title={connectionStatus[printer.id] === true ? 'Verbunden' : connectionStatus[printer.id] === false ? 'Nicht verbunden' : 'Unbekannt'}
                    />
                    <Text fw={500}>{printer.name}</Text>
                    <Badge size="sm" variant="light">{printer.printer_type}</Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {printer.host}:{printer.port}
                  </Text>
                </div>
                <Menu shadow="md" width={150} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconRefresh size={16} />}
                      onClick={() => handleTest(printer.id)}
                      loading={testingId === printer.id}
                    >
                      Test Connection
                    </Menu.Item>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(printer)}>
                      Edit
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => handleDelete(printer.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              {printer.last_connected && (
                <Text size="xs" c="dimmed">
                  Last connected: {new Date(printer.last_connected).toLocaleString()}
                </Text>
              )}
            </Card>
          ))}
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
    </Stack>
  );
}
