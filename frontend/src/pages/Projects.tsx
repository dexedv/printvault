import { useEffect, useState } from 'react';
import {
  Title,
  TextInput,
  Group,
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
  Textarea,
  TagsInput,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUpload,
  IconSearch,
  IconDotsVertical,
  IconTrash,
  IconEdit,
  IconFolder,
  IconPlus,
  IconVersions,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useProjectsStore } from '../store';
import { projectsApi } from '../api/client';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, loading, error, searchQuery, setProjects, setLoading, setError, setSearchQuery, addProject, removeProject } = useProjectsStore();
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', tags: '' as string | string[] });

  const loadProjekte = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list({ limit: 100 });
      setProjects(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjekte();
  }, []);

  const handleCreate = async () => {
    try {
      const tags = Array.isArray(newProject.tags) ? newProject.tags.join(',') : newProject.tags;
      const created = await projectsApi.create({
        name: newProject.name,
        description: newProject.description,
        tags,
      });
      addProject(created);
      closeCreateModal();
      setNewProject({ name: '', description: '', tags: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await projectsApi.delete(id);
      removeProject(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProjekte = projects.filter((project) =>
    !searchQuery ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projekte</h1>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          <IconPlus className="w-4 h-4" />
          Neues Projekt
        </button>
      </div>

      <TextInput
        placeholder="Projekte suchen..."
        leftSection={<IconSearch className="w-4 h-4 text-slate-400" />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
        styles={{ input: { backgroundColor: 'white', borderColor: '#e2e8f0' } }}
      />

      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      {filteredProjekte.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconFolder size={48} color="#94a3b8" />
            <Text c="dimmed">Noch keine Projekte</Text>
            <Button variant="light" onClick={openCreateModal}>
              Erstes Projekt erstellen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filteredProjekte.map((project) => (
            <Card
              key={project.id}
              className="card card-hover cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="lg">
                  {project.name}
                </Text>
                <Menu shadow="md" width={150} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconVersions size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                    >
                      View Versions
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              {project.description && (
                <Text size="sm" c="dimmed" lineClamp={2} mb="sm">
                  {project.description}
                </Text>
              )}

              {project.tags && project.tags.length > 0 && (
                <Group gap="xs" mb="sm">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} size="sm" variant="light">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge size="sm" variant="light">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </Group>
              )}

              <Text size="xs" c="dimmed">
                Updated: {new Date(project.updated_at).toLocaleDateString()}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create Project" centered>
        <Stack>
          <TextInput
            label="Name"
            placeholder="Project name"
            required
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />
          <Textarea
            label="Beschreibung"
            placeholder="Project description (optional)"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
          <TagsInput
            label="Schlagwörter"
            placeholder="Enter drücken um Schlagwort hinzuzufügen"
            value={Array.isArray(newProject.tags) ? newProject.tags : []}
            onChange={(tags) => setNewProject({ ...newProject, tags })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newProject.name}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
