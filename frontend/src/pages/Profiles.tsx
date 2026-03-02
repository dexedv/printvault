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
  Switch,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconDotsVertical, IconTrash, IconEdit, IconSettings } from '@tabler/icons-react';
import { profilesApi } from '../api/client';
import type { PrintProfile } from '@shared/types';
import classes from './Profiles.module.css';

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

export default function Profiles() {
  const [profiles, setProfiles] = useState<PrintProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingProfile, setEditingProfile] = useState<PrintProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    material: 'PLA',
    nozzle_temp: 200,
    bed_temp: 60,
    layer_height: 0.2,
    print_speed: 50,
    infill: 20,
    notes: '',
    is_default: false,
  });

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await profilesApi.list();
      setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingProfile) {
        const updated = await profilesApi.update(editingProfile.id, formData);
        setProfiles(profiles.map((p) => (p.id === editingProfile.id ? updated : p)));
      } else {
        const created = await profilesApi.create(formData);
        setProfiles([...profiles, created]);
      }
      closeModal();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await profilesApi.delete(id);
      setProfiles(profiles.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      material: 'PLA',
      nozzle_temp: 200,
      bed_temp: 60,
      layer_height: 0.2,
      print_speed: 50,
      infill: 20,
      notes: '',
      is_default: false,
    });
  };

  const openEdit = (profile: PrintProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      material: profile.material,
      nozzle_temp: profile.nozzle_temp,
      bed_temp: profile.bed_temp,
      layer_height: profile.layer_height,
      print_speed: profile.print_speed,
      infill: profile.infill,
      notes: profile.notes || '',
      is_default: profile.is_default,
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
        <Title order={2}>Druckprofile</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={() => { resetForm(); openModal(); }}>
          New Profile
        </Button>
      </Group>

      {profiles.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md" p="xl">
            <Box className={classes.emptyIcon} style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconSettings size={36} color="#6366f1" />
            </Box>
            <Text c="dimmed" size="lg">Keine Druckprofile</Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Erstes Profil erstellen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5, lg: 6 }} spacing="md" verticalSpacing="md">
          {profiles.map((profile) => {
            const materialColor = MATERIAL_COLORS[profile.material] || '#6b7280';
            return (
              <Card key={profile.id} padding={0} withBorder className={classes.profileCard}>
                <Box style={{
                  height: '6px',
                  background: `linear-gradient(90deg, ${materialColor} 0%, ${materialColor}cc 100%)`,
                }} />
                <Box p="md">
                  <Group justify="space-between" mb="md">
                    <Group gap="sm">
                      <Box
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: `${materialColor}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconSettings size={20} color={materialColor} />
                      </Box>
                      <div>
                        <Group gap="xs">
                          <Text fw={600} size="md">{profile.name}</Text>
                          {profile.is_default && <Badge size="xs" color="blue" variant="filled">Standard</Badge>}
                        </Group>
                        <Badge size="sm" variant="light" color={materialColor}>{profile.material}</Badge>
                      </div>
                    </Group>
                    <Menu shadow="md" width={150} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" size="lg">
                          <IconDotsVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(profile)}>
                          Bearbeiten
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleDelete(profile.id)}>
                          Löschen
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>

                  <SimpleGrid cols={3} spacing="xs">
                    <Box className={classes.statBox}>
                      <Text size="xs" c="dimmed">Düse</Text>
                      <Text fw={600} size="sm">{profile.nozzle_temp}°</Text>
                    </Box>
                    <Box className={classes.statBox}>
                      <Text size="xs" c="dimmed">Bett</Text>
                      <Text fw={600} size="sm">{profile.bed_temp}°</Text>
                    </Box>
                    <Box className={classes.statBox}>
                      <Text size="xs" c="dimmed">Schicht</Text>
                      <Text fw={600} size="sm">{profile.layer_height}</Text>
                    </Box>
                    <Box className={classes.statBox}>
                      <Text size="xs" c="dimmed">Speed</Text>
                      <Text fw={600} size="sm">{profile.print_speed}</Text>
                    </Box>
                    <Box className={classes.statBox}>
                      <Text size="xs" c="dimmed">Füllung</Text>
                      <Text fw={600} size="sm">{profile.infill}%</Text>
                    </Box>
                  </SimpleGrid>
                </Box>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Modal opened={modalOpened} onClose={closeModal} title={editingProfile ? 'Edit Profile' : 'New Profile'} centered>
        <Stack>
          <TextInput
            label="Profile Name"
            placeholder="e.g., PLA Fast"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Material"
            data={MATERIALS}
            value={formData.material}
            onChange={(v) => setFormData({ ...formData, material: v || 'PLA' })}
          />
          <Group grow>
            <NumberInput
              label="Nozzle Temp (°C)"
              value={formData.nozzle_temp}
              onChange={(v) => setFormData({ ...formData, nozzle_temp: Number(v) })}
            />
            <NumberInput
              label="Bed Temp (°C)"
              value={formData.bed_temp}
              onChange={(v) => setFormData({ ...formData, bed_temp: Number(v) })}
            />
          </Group>
          <Group grow>
            <NumberInput
              label="Layer Height (mm)"
              step={0.01}
              value={formData.layer_height}
              onChange={(v) => setFormData({ ...formData, layer_height: Number(v) })}
            />
            <NumberInput
              label="Print Speed (mm/s)"
              value={formData.print_speed}
              onChange={(v) => setFormData({ ...formData, print_speed: Number(v) })}
            />
          </Group>
          <NumberInput
            label="Infill (%)"
            min={0}
            max={100}
            value={formData.infill}
            onChange={(v) => setFormData({ ...formData, infill: Number(v) })}
          />
          <Switch
            label="Set as default for this material"
            checked={formData.is_default}
            onChange={(e) => setFormData({ ...formData, is_default: e.currentTarget.checked })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
