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
  Select,
  Group,
  ColorSwatch,
  Progress,
  Popover,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconAlertTriangle,
  IconPalette,
} from '@tabler/icons-react';
import { useFilamentsStore } from '../store';
import { filamentsApi } from '../api/client';
import type { Filament } from '@shared/types';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PVB', 'PP', 'PEI'];

const COLOR_PALETTE = [
  // Basic colors
  '#ffffff', '#000000', '#f3f4f6', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151',
  // Red
  '#ef4444', '#fca5a5', '#f87171', '#dc2626', '#b91c1c', '#991b1b',
  // Orange
  '#f97316', '#fdba74', '#fb923c', '#ea580c', '#c2410c',
  // Yellow
  '#eab308', '#fde047', '#facc15', '#ca8a04', '#a16207',
  // Green
  '#22c55e', '#86efac', '#4ade80', '#16a34a', '#15803d', '#166534',
  // Blue
  '#3b82f6', '#93c5fd', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af',
  // Purple
  '#a855f7', '#d8b4fe', '#c084fc', '#9333ea', '#7e22ce', '#6b21a8',
  // Pink
  '#ec4899', '#f9a8d4', '#f472b6', '#db2777', '#be185d',
  // Brown
  '#a16207', '#d97706', '#92400e', '#78350f', '#451a03',
  // Special
  '#c0c0c0', '#808080', '#00ff00', '#00ffff', '#ff00ff',
];

export default function Filaments() {
  const { filaments, loading, setFilaments, setLoading, addFilament, updateFilament, removeFilament } = useFilamentsStore();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [formData, setFormData] = useState({
    material: 'PLA',
    color_name: '',
    color_hex: '#3b82f6',
    vendor: '',
    total_weight_kg: 1,
    remaining_weight_kg: 1,
    spool_cost: 0,
    location: '',
    notes: '',
    low_stock_threshold: 0.1,
  });

  const loadFilaments = async () => {
    setLoading(true);
    try {
      const data = await filamentsApi.list({ limit: 100 });
      setFilaments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilaments();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingFilament) {
        const updated = await filamentsApi.update(editingFilament.id, formData);
        updateFilament(editingFilament.id, updated);
      } else {
        const created = await filamentsApi.create(formData);
        addFilament(created);
      }
      closeModal();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await filamentsApi.delete(id);
      removeFilament(id);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingFilament(null);
    setFormData({
      material: 'PLA',
      color_name: '',
      color_hex: '#3b82f6',
      vendor: '',
      total_weight_kg: 1,
      remaining_weight_kg: 1,
      spool_cost: 0,
      location: '',
      notes: '',
      low_stock_threshold: 0.1,
    });
  };

  const openEdit = (filament: Filament) => {
    setEditingFilament(filament);
    setFormData({
      material: filament.material,
      color_name: filament.color_name,
      color_hex: filament.color_hex,
      vendor: filament.vendor || '',
      total_weight_kg: filament.total_weight_kg,
      remaining_weight_kg: filament.remaining_weight_kg,
      spool_cost: filament.spool_cost || 0,
      location: filament.location || '',
      notes: filament.notes || '',
      low_stock_threshold: filament.low_stock_threshold,
    });
    openModal();
  };

  const getRemainingPercent = (filament: Filament) => {
    return (filament.remaining_weight_kg / filament.total_weight_kg) * 100;
  };

  const isLowStock = (filament: Filament) => {
    return filament.remaining_weight_kg <= filament.low_stock_threshold;
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
        <Title order={2}>Filamente</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={() => { resetForm(); openModal(); }}>
          Filament hinzufügen
        </Button>
      </Group>

      {filaments.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Text c="dimmed">Keine Filamente im Lager</Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Erstes Filament hinzufügen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filaments.map((filament) => (
            <Card key={filament.id} padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Group>
                  <ColorSwatch color={filament.color_hex} size={32} />
                  <div>
                    <Text fw={500}>{filament.color_name}</Text>
                    <Text size="xs" c="dimmed">
                      {filament.material}
                    </Text>
                  </div>
                </Group>
                <Menu shadow="md" width={150} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(filament)}>
                      Edit
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => handleDelete(filament.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Remaining</Text>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {filament.remaining_weight_kg.toFixed(2)} kg
                    </Text>
                    {isLowStock(filament) && <IconAlertTriangle size={16} color="#f59e0b" />}
                  </Group>
                </Group>
                <Progress
                  value={getRemainingPercent(filament)}
                  color={isLowStock(filament) ? 'orange' : 'blue'}
                  size="sm"
                />
                <Text size="xs" c="dimmed">
                  {getRemainingPercent(filament).toFixed(0)}% of {filament.total_weight_kg} kg
                </Text>
              </Stack>

              {filament.vendor && (
                <Text size="xs" c="dimmed" mt="sm">
                  Vendor: {filament.vendor}
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingFilament ? 'Edit Filament' : 'Add Filament'} centered>
        <Stack>
          <Select
            label="Material"
            data={MATERIALS}
            value={formData.material}
            onChange={(v) => setFormData({ ...formData, material: v || 'PLA' })}
            required
          />
          <TextInput
            label="Color Name"
            placeholder="e.g., Midnight Blue"
            value={formData.color_name}
            onChange={(e) => setFormData({ ...formData, color_name: e.target.value })}
            required
          />
          <Group align="flex-end">
            <TextInput
              label="Farbe"
              placeholder="#3b82f6"
              value={formData.color_hex}
              onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
              style={{ flex: 1 }}
            />
            <Popover width={340} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <ActionIcon size="lg" variant="default" mt={24}>
                  <ColorSwatch color={formData.color_hex} size={18} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Text size="sm" fw={500} mb="xs">Farbpalette</Text>
                <Group gap={6}>
                  {COLOR_PALETTE.map((color) => (
                    <UnstyledButton
                      key={color}
                      onClick={() => setFormData({ ...formData, color_hex: color })}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: color,
                        border: formData.color_hex === color ? '2px solid #228be6' : '1px solid #dee2e6',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Group>
                <TextInput
                  placeholder="Eigene Farbe"
                  value={formData.color_hex}
                  onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                  mt="sm"
                  size="xs"
                />
              </Popover.Dropdown>
            </Popover>
          </Group>
          <NumberInput
            label="Total Weight (kg)"
            min={0.1}
            step={0.1}
            value={formData.total_weight_kg}
            onChange={(v) => setFormData({ ...formData, total_weight_kg: Number(v) || 1 })}
          />
          <NumberInput
            label="Remaining Weight (kg)"
            min={0}
            step={0.01}
            value={formData.remaining_weight_kg}
            onChange={(v) => setFormData({ ...formData, remaining_weight_kg: Number(v) || 0 })}
          />
          <TextInput
            label="Vendor"
            placeholder="e.g., Hatchbox, Prusament"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          />
          <TextInput
            label="Location"
            placeholder="e.g., Shelf A, Bin 3"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.color_name}>
              {editingFilament ? 'Save' : 'Add'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
