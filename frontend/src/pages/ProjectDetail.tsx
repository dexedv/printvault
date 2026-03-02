import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Image,
  Badge,
  Loader,
  Center,
  Box,
  Breadcrumbs,
  Anchor,
  ActionIcon,
  Menu,
} from '@mantine/core';
import {
  IconUpload,
  IconArrowLeft,
  IconTrash,
  IconDownload,
  IconEye,
  IconDotsVertical,
} from '@tabler/icons-react';
import { projectsApi } from '../api/client';
import type { Project, ProjectVersion } from '@shared/types';
import ModelViewer from '../components/ModelViewer';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);

  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [projectData, versionsData] = await Promise.all([
        projectsApi.get(parseInt(id)),
        projectsApi.getVersions(parseInt(id)),
      ]);
      setProject(projectData);
      setVersions(versionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handleUpload = async () => {
    if (!id) return;
    setUploading(true);
    try {
      const result = await window.electronAPI?.openFile({
        filters: [{ name: '3D Files', extensions: ['stl', '3mf', 'gcode', 'step'] }],
      });

      if (result?.canceled || !result?.filePaths.length) {
        setUploading(false);
        return;
      }

      // Upload each file as a version
      for (const filePath of result.filePaths) {
        const response = await fetch(`file://${filePath}`);
        const blob = await response.blob();
        const fileName = filePath.split(/[/\\]/).pop() || 'file';
        const file = new File([blob], fileName);

        await projectsApi.uploadVersion(parseInt(id), file);
      }

      // Reload versions
      const versionsData = await projectsApi.getVersions(parseInt(id));
      setVersions(versionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => `${bytes.toFixed(2)} MB`;

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!project) {
    return (
      <Center h="100%">
        <Text>Project not found</Text>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Group>

      <Group justify="space-between">
        <div>
          <Breadcrumbs>
            <Anchor onClick={() => navigate('/projects')}>Projects</Anchor>
            <Text>{project.name}</Text>
          </Breadcrumbs>
          <Title order={2} mt="xs">
            {project.name}
          </Title>
          {project.description && <Text c="dimmed">{project.description}</Text>}
        </div>
        <Button leftSection={<IconUpload size={18} />} onClick={handleUpload} loading={uploading}>
          Upload Version
        </Button>
      </Group>

      {project.tags && project.tags.length > 0 && (
        <Group gap="xs">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="light">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      {selectedVersion ? (
        <Card padding="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Version {selectedVersion.version}</Title>
            <Button variant="subtle" size="xs" onClick={() => setSelectedVersion(null)}>
              Close Preview
            </Button>
          </Group>
          <Box h={400} mb="md">
            <ModelViewer filePath={selectedVersion.file_path} />
          </Box>
          <Group gap="xl">
            <div>
              <Text size="sm" c="dimmed">File Type</Text>
              <Badge>{selectedVersion.file_type.toUpperCase()}</Badge>
            </div>
            <div>
              <Text size="sm" c="dimmed">File Size</Text>
              <Text size="sm">{formatFileSize(selectedVersion.file_size)}</Text>
            </div>
            {selectedVersion.triangle_count && (
              <div>
                <Text size="sm" c="dimmed">Triangles</Text>
                <Text size="sm">{selectedVersion.triangle_count.toLocaleString()}</Text>
              </div>
            )}
            {selectedVersion.volume && (
              <div>
                <Text size="sm" c="dimmed">Volume</Text>
                <Text size="sm">{(selectedVersion.volume / 1000).toFixed(2)} cm³</Text>
              </div>
            )}
          </Group>
        </Card>
      ) : versions.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Text c="dimmed">No versions uploaded yet</Text>
            <Button variant="light" onClick={handleUpload}>
              Upload first version
            </Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="sm">
          {versions.map((version) => (
            <Card key={version.id} padding="sm" withBorder>
              <Group justify="space-between">
                <Group>
                  <Box
                    w={60}
                    h={60}
                    style={{
                      background: '#f8fafc',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedVersion(version)}
                  >
                    {version.thumbnail_path ? (
                      <Image
                        src={`http://localhost:8000/${version.thumbnail_path}`}
                        w={60}
                        h={60}
                        fit="cover"
                        radius="sm"
                      />
                    ) : (
                      <IconEye size={24} color="#94a3b8" />
                    )}
                  </Box>
                  <div>
                    <Group gap="xs">
                      <Text fw={500}>Version {version.version}</Text>
                      <Badge size="sm" variant="light">
                        {version.file_type.toUpperCase()}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatFileSize(version.file_size)} • {new Date(version.created_at).toLocaleString()}
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
                    <Menu.Item leftSection={<IconEye size={16} />} onClick={() => setSelectedVersion(version)}>
                      Preview
                    </Menu.Item>
                    <Menu.Item leftSection={<IconDownload size={16} />}>Download</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<IconTrash size={16} />}>
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
