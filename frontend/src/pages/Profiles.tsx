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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconDotsVertical, IconTrash, IconEdit } from '@tabler/icons-react';
import { profilesApi } from '../api/client';
import type { PrintProfile } from '@shared/types';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PVB', 'PP', 'PEI'];

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
          <Stack align="center" gap="sm">
            <Text c="dimmed">Keine Druckprofile</Text>
            <Button variant="light" onClick={() => { resetForm(); openModal(); }}>
              Erstes Profil erstellen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {profiles.map((profile) => (
            <Card key={profile.id} padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <div>
                  <Group gap="xs">
                    <Text fw={500}>{profile.name}</Text>
                    {profile.is_default && <Badge size="sm" color="blue">Default</Badge>}
                  </Group>
                  <Text size="xs" c="dimmed">{profile.material}</Text>
                </div>
                <Menu shadow="md" width={150} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => openEdit(profile)}>
                      Edit
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => handleDelete(profile.id)}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <SimpleGrid cols={2} spacing="xs">
                <div>
                  <Text size="xs" c="dimmed">Nozzle</Text>
                  <Text size="sm">{profile.nozzle_temp}°C</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Bed</Text>
                  <Text size="sm">{profile.bed_temp}°C</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Layer</Text>
                  <Text size="sm">{profile.layer_height}mm</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Speed</Text>
                  <Text size="sm">{profile.print_speed}mm/s</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Infill</Text>
                  <Text size="sm">{profile.infill}%</Text>
                </div>
              </SimpleGrid>
            </Card>
          ))}
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
