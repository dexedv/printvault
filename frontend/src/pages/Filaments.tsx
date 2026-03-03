import { useEffect, useState, useMemo } from 'react';
import classes from './Filaments.module.css';
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
  Box,
  ThemeIcon,
  Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconAlertTriangle,
  IconX,
  IconPackage,
  IconThermometer,
  IconWeight,
  IconBrandWindows,
  IconStack2,
  IconDroplet,
  IconRefresh,
} from '@tabler/icons-react';
import { useFilamentsStore } from '../store';
import { filamentsApi } from '../api/client';
import type { Filament } from '@shared/types';
import LimitExceededModal from '../components/LimitExceededModal';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PVB', 'PP', 'PEI'];

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#22c55e',
  PETG: '#3b82f6',
  ABS: '#f97316',
  TPU: '#ec4899',
  ASA: '#a855f7',
  PC: '#06b6d4',
  PA: '#84cc16',
  PVB: '#f59e0b',
  PP: '#6366f1',
  PEI: '#ef4444',
};

const MATERIAL_GRADIENTS: Record<string, string> = {
  PLA: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  PETG: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  ABS: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  TPU: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  ASA: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  PC: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  PA: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
  PVB: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  PP: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  PEI: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
};

const COLOR_PALETTE = [
  '#ffffff', '#000000', '#f3f4f6', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151',
  '#ef4444', '#fca5a5', '#f87171', '#dc2626', '#b91c1c', '#991b1b',
  '#f97316', '#fdba74', '#fb923c', '#ea580c', '#c2410c',
  '#eab308', '#fde047', '#facc15', '#ca8a04', '#a16207',
  '#22c55e', '#86efac', '#4ade80', '#16a34a', '#15803d', '#166534',
  '#3b82f6', '#93c5fd', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af',
  '#a855f7', '#d8b4fe', '#c084fc', '#9333ea', '#7e22ce', '#6b21a8',
  '#ec4899', '#f9a8d4', '#f472b6', '#db2777', '#be185d',
  '#a16207', '#d97706', '#92400e', '#78350f', '#451a03',
  '#c0c0c0', '#808080', '#00ff00', '#00ffff', '#ff00ff',
];

export default function Filaments() {
  const { filaments, loading, setFilaments, setLoading, addFilament, updateFilament, removeFilament } = useFilamentsStore();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ resource: 'filaments', current: 0, limit: 5 });
  const [refreshing, setRefreshing] = useState(false);
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

  const loadFilaments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await filamentsApi.list({ limit: 100 });
      setFilaments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadFilaments(true);
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
    } catch (err: any) {
      console.error(err);
      // Check if it's a limit error
      if (err.response?.status === 403 && err.response?.data?.detail?.includes('Limit')) {
        // Parse the error message to get current and limit
        const msg = err.response.data.detail;
        const match = msg.match(/bereits (\d+) von maximal (\d+)/);
        setLimitInfo({
          resource: 'filaments',
          current: match ? parseInt(match[1]) : filaments.length,
          limit: match ? parseInt(match[2]) : 5
        });
        setLimitModalOpen(true);
      }
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

  // Filter filaments by material
  const filteredFilaments = useMemo(() => {
    if (!materialFilter) return filaments;
    return filaments.filter(f => f.material === materialFilter);
  }, [filaments, materialFilter]);

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header Section */}
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <ThemeIcon size={40} radius="md" variant="light" color="blue">
            <IconStack2 size={24} />
          </ThemeIcon>
          <div>
            <Title order={2} style={{ margin: 0 }}>Filamente</Title>
            <Text size="sm" c="dimmed">{filaments.length} Filamente im Lager</Text>
          </div>
        </Group>
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
          <Button leftSection={<IconPlus size={18} />} onClick={() => { resetForm(); openModal(); }} size="md">
            Filament hinzufügen
          </Button>
        </Group>
      </Group>

      {/* Material Filter Pills */}
      <Box>
        <Group gap="xs" wrap="nowrap" style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <UnstyledButton
            onClick={() => setMaterialFilter(null)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: materialFilter === null ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f1f3f5',
              color: materialFilter === null ? 'white' : '#495057',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: materialFilter === null ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            Alle <Badge size="xs" ml={6} variant="filled" color={materialFilter === null ? 'white' : 'gray'}>{filaments.length}</Badge>
          </UnstyledButton>
          {MATERIALS.map((material) => {
            const count = filaments.filter(f => f.material === material).length;
            if (count === 0) return null;
            return (
              <UnstyledButton
                key={material}
                onClick={() => setMaterialFilter(material)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: materialFilter === material ? MATERIAL_GRADIENTS[material] : '#f1f3f5',
                  color: materialFilter === material ? 'white' : '#495057',
                  fontWeight: 500,
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: materialFilter === material ? `0 4px 12px ${MATERIAL_COLORS[material]}66` : 'none',
                }}
              >
                {material} <Badge size="xs" ml={6} variant="filled" color={materialFilter === material ? 'white' : 'gray'}>{count}</Badge>
              </UnstyledButton>
            );
          })}
          {materialFilter && (
            <UnstyledButton
              onClick={() => setMaterialFilter(null)}
              style={{
                padding: 6,
                borderRadius: '50%',
                background: '#f1f3f5',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconX size={14} />
            </UnstyledButton>
          )}
        </Group>
      </Box>

      {filteredFilaments.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconPackage size={36} color="#94a3b8" />
            </Box>
            <Text c="dimmed" size="lg">
              {materialFilter
                ? `Keine ${materialFilter} Filamente im Lager`
                : 'Keine Filamente im Lager'}
            </Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Filament hinzufügen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md" verticalSpacing="md">
          {filteredFilaments.map((filament) => {
            const percent = getRemainingPercent(filament);
            const lowStock = isLowStock(filament);
            const materialColor = MATERIAL_COLORS[filament.material] || '#6b7280';
            const materialGradient = MATERIAL_GRADIENTS[filament.material] || MATERIAL_GRADIENTS.PLA;

            return (
              <Card
                key={filament.id}
                padding={0}
                withBorder
                className={classes.filamentCard}
                style={{
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Modern gradient header with glow effect */}
                <Box
                  style={{
                    height: 80,
                    background: materialGradient,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Animated shine effect */}
                  <Box
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '200%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                      animation: 'shine 3s infinite',
                    }}
                  />

                  {/* Color preview circle with glow */}
                  <Center style={{ height: '100%' }}>
                    <Box
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: filament.color_hex,
                        border: '3px solid rgba(255,255,255,0.9)',
                        boxShadow: `0 4px 20px ${filament.color_hex}88, 0 0 40px ${filament.color_hex}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ColorSwatch color={filament.color_hex} size={36} style={{ border: '1px solid rgba(255,255,255,0.3)' }} />
                    </Box>
                  </Center>

                  {/* Material badge */}
                  <Badge
                    size="sm"
                    variant="filled"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  >
                    {filament.material}
                  </Badge>

                  {/* Low stock warning */}
                  {lowStock && (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="red"
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        animation: 'pulse 2s infinite',
                      }}
                      leftSection={<IconAlertTriangle size={10} />}
                    >
                      Niedrig
                    </Badge>
                  )}
                </Box>

                {/* Content */}
                <Box p="md">
                  {/* Filament name */}
                  <Text fw={700} size="lg" mb="xs" lineClamp={1} style={{ color: '#1e293b' }}>
                    {filament.color_name}
                  </Text>

                  {/* Vendor and location */}
                  <Group gap="xs" mb="md">
                    {filament.vendor && (
                      <Badge variant="outline" color="gray" size="sm" style={{ borderColor: '#e2e8f0' }}>
                        {filament.vendor}
                      </Badge>
                    )}
                    {filament.location && (
                      <Badge variant="light" color="blue" size="sm">
                        {filament.location}
                      </Badge>
                    )}
                  </Group>

                  {/* Weight info card */}
                  <Paper
                    p="sm"
                    style={{
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <Group justify="space-between" align="flex-end" mb="xs">
                      <div>
                        <Group gap={4}>
                          <IconWeight size={14} color="#64748b" />
                          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Gewicht</Text>
                        </Group>
                        <Text fw={700} size="xl" style={{ color: materialColor, lineHeight: 1.2 }}>
                          {filament.remaining_weight_kg.toFixed(2)}
                          <Text span size="sm" fw={400} c="dimmed"> kg</Text>
                        </Text>
                      </div>
                      <Text size="xs" c="dimmed">
                        von {filament.total_weight_kg} kg
                      </Text>
                    </Group>

                    {/* Progress bar with gradient */}
                    <Box mt="xs">
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" c="dimmed">Füllstand</Text>
                        <Text size="xs" fw={600} style={{ color: lowStock ? '#f97316' : materialColor }}>
                          {percent.toFixed(0)}%
                        </Text>
                      </Group>
                      <Progress
                        value={percent}
                        color={lowStock ? 'orange' : materialColor}
                        size="sm"
                        radius="xl"
                        animated={lowStock}
                        style={{
                          background: '#e2e8f0',
                        }}
                      />
                    </Box>
                  </Paper>

                  {/* Action menu */}
                  <Menu shadow="lg" width={160} position="bottom-end" withArrow>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        style={{
                          position: 'absolute',
                          bottom: 12,
                          right: 12,
                        }}
                      >
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown style={{ border: '1px solid #e2e8f0' }}>
                      <Menu.Item
                        leftSection={<IconEdit size={16} />}
                        onClick={() => openEdit(filament)}
                        style={{ borderRadius: 8 }}
                      >
                        Bearbeiten
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => handleDelete(filament.id)}
                        style={{ borderRadius: 8 }}
                      >
                        Löschen
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Box>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Add/Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Group gap="sm">
            <ThemeIcon size={24} radius="xl" variant="light" color="blue">
              <IconPlus size={14} />
            </ThemeIcon>
            <Text fw={600}>{editingFilament ? 'Filament bearbeiten' : 'Neues Filament'}</Text>
          </Group>
        }
        centered
        size="md"
      >
        <Stack>
          <Group grow>
            <Select
              label="Material"
              data={MATERIALS}
              value={formData.material}
              onChange={(v) => setFormData({ ...formData, material: v || 'PLA' })}
              required
              leftSection={<IconThermometer size={16} />}
            />
            <TextInput
              label="Farbname"
              placeholder="z.B. Midnight Blue"
              value={formData.color_name}
              onChange={(e) => setFormData({ ...formData, color_name: e.target.value })}
              required
              leftSection={<IconDroplet size={16} />}
            />
          </Group>

          <Group align="flex-end">
            <TextInput
              label="Farbe"
              placeholder="#3b82f6"
              value={formData.color_hex}
              onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
              style={{ flex: 1 }}
              leftSection={<IconDroplet size={16} />}
            />
            <Popover width={360} position="bottom" withArrow shadow="lg">
              <Popover.Target>
                <ActionIcon size="xl" variant="filled" radius="md" style={{ background: formData.color_hex }}>
                  <ColorSwatch color={formData.color_hex} size={22} />
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
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: color,
                        border: formData.color_hex === color ? '3px solid #228be6' : '1px solid #dee2e6',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </Group>
              </Popover.Dropdown>
            </Popover>
          </Group>

          <Group grow>
            <NumberInput
              label="Gesamtgewicht (kg)"
              min={0.1}
              step={0.1}
              value={formData.total_weight_kg}
              onChange={(v) => setFormData({ ...formData, total_weight_kg: Number(v) || 1 })}
              leftSection={<IconWeight size={16} />}
            />
            <NumberInput
              label="Verbleibend (kg)"
              min={0}
              step={0.01}
              value={formData.remaining_weight_kg}
              onChange={(v) => setFormData({ ...formData, remaining_weight_kg: Number(v) || 0 })}
              leftSection={<IconPackage size={16} />}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Hersteller"
              placeholder="z.B. Hatchbox, Prusament"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
            <TextInput
              label="Lagerort"
              placeholder="z.B. Regal A, Schublade 3"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.color_name}>
              {editingFilament ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

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
