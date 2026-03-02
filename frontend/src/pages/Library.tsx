import { useEffect, useState } from 'react';
import { TextInput, SimpleGrid, Card, Image, Text, Badge, ActionIcon, Menu, Select, Stack, Loader, Center, Box, Modal, Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUpload,
  IconSearch,
  IconDotsVertical,
  IconTrash,
  IconDownload,
  IconEye,
  IconFilter,
  IconFile,
  Icon3dCubeSphere,
} from '@tabler/icons-react';
import { useFilesStore } from '../store';
import { filesApi } from '../api/client';
import ModelViewer from '../components/ModelViewer';
import classes from './Library.module.css';

export default function Library() {
  const { files, loading, error, searchQuery, setFiles, setLoading, setError, setSearchQuery, addFile, removeFile } = useFilesStore();
  const [fileTypeFilter, setFileTypeFilter] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [viewerOpen, { open: openViewer, close: closeViewer }] = useDisclosure(false);
  const [uploading, setUploading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await filesApi.list({ limit: 100 });
      setFiles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async () => {
    // Use Tauri/Electron file dialog if available
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile({
        filters: [
          { name: '3D Files', extensions: ['stl', '3mf', 'gcode', 'step'] },
        ],
      });

      if (result.canceled || !result.filePaths.length) return;

      setUploading(true);
      try {
        for (const filePath of result.filePaths) {
          const response = await fetch(`file://${filePath}`);
          const blob = await response.blob();
          const fileName = filePath.split(/[/\\]/).pop() || 'file';
          const file = new File([blob], fileName);

          const uploaded = await filesApi.upload(file);
          addFile(uploaded);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    } else {
      // Fallback: Create hidden file input for browser/web mode
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.stl,.3mf,.gcode,.step';
      input.multiple = true;

      input.onchange = async () => {
        if (!input.files?.length) return;

        setUploading(true);
        try {
          for (const file of input.files) {
            const uploaded = await filesApi.upload(file);
            addFile(uploaded);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setUploading(false);
        }
      };

      input.click();
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await filesApi.delete(id);
      removeFile(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = !searchQuery || file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !fileTypeFilter || file.file_type === fileTypeFilter;
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1) return `${(bytes * 1024).toFixed(1)} KB`;
    return `${bytes.toFixed(2)} MB`;
  };

  const getFileTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      stl: 'blue',
      '3mf': 'green',
      gcode: 'orange',
      step: 'purple',
    };
    return colors[type] || 'gray';
  };

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <Text size="xl" fw={700} c="dark">Dateibibliothek</Text>
        <Button leftSection={<IconUpload size={18} />} onClick={handleUpload} loading={uploading}>
          Dateien hochladen
        </Button>
      </Group>

      {/* Filters */}
      <Group>
        <TextInput
          placeholder="Dateien suchen..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Nach Typ filtern"
          leftSection={<IconFilter size={16} />}
          value={fileTypeFilter}
          onChange={setFileTypeFilter}
          clearable
          data={[
            { value: 'stl', label: 'STL' },
            { value: '3mf', label: '3MF' },
            { value: 'gcode', label: 'GCODE' },
            { value: 'step', label: 'STEP' },
          ]}
          style={{ width: 180 }}
        />
      </Group>

      {error && <Text c="red" size="sm">{error}</Text>}

      {/* File Grid */}
      {filteredFiles.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md" p="xl">
            <Box className={classes.emptyIcon} style={{ width: 80, height: 80 }}>
              <Icon3dCubeSphere size={36} color="#94a3b8" />
            </Box>
            <Text c="dimmed" size="lg">Keine Dateien in der Bibliothek</Text>
            <Button variant="light" onClick={handleUpload}>
              Erste Datei hochladen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
          {filteredFiles.map((file) => {
            const typeColor = getFileTypeColor(file.file_type);
            return (
              <Card key={file.id} padding={0} withBorder className={classes.card}>
                {/* Colored top bar */}
                <Box style={{
                  height: '6px',
                  background: typeColor === 'blue' ? 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)'
                    : typeColor === 'green' ? 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'
                    : typeColor === 'orange' ? 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)'
                    : 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                }} />

                {/* Thumbnail */}
                <Box style={{
                  height: 160,
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }} onClick={() => { setSelectedFile(file); openViewer(); }}>
                  {file.thumbnail_path ? (
                    <Image
                      src={`http://localhost:8000/${file.thumbnail_path}`}
                      alt={file.original_name}
                      h={160}
                      fit="cover"
                      w="100%"
                      className={classes.thumbnail}
                    />
                  ) : (
                    <Icon3dCubeSphere size={48} color="#cbd5e1" />
                  )}
                </Box>

                {/* Info */}
                <Box p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm" style={{ flex: 1 }} truncate>
                      {file.original_name}
                    </Text>
                    <Badge size="sm" color={typeColor} variant="filled">
                      {file.file_type.toUpperCase()}
                    </Badge>
                  </Group>
                  <Group gap="xs" mb="xs">
                    <Text size="xs" c="dimmed">{formatFileSize(file.file_size)}</Text>
                    {file.triangle_count && (
                      <>
                        <Text size="xs" c="dimmed">•</Text>
                        <Text size="xs" c="dimmed">{file.triangle_count.toLocaleString()} tris</Text>
                      </>
                    )}
                  </Group>
                  {file.volume && (
                    <Text size="xs" c="dimmed">Volumen: {(file.volume / 1000).toFixed(2)} cm³</Text>
                  )}

                  {/* Actions */}
                  <Menu shadow="md" width={150} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="sm" style={{ position: 'absolute', bottom: 12, right: 12 }}>
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => { setSelectedFile(file); openViewer(); }}>Vorschau</Menu.Item>
                      <Menu.Item leftSection={<IconDownload size={14} />}>Herunterladen</Menu.Item>
                      <Menu.Divider />
                      <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(file.id)}>Löschen</Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Box>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Viewer Modal */}
      <Modal opened={viewerOpen} onClose={closeViewer} size="xl" title={selectedFile?.original_name} centered>
        <Box h={400}>
          <ModelViewer filePath={selectedFile?.file_path} />
        </Box>
        {selectedFile && (
          <Group gap="xl" mt="md">
            <div>
              <Text size="sm" c="dimmed">Abmessungen</Text>
              {selectedFile.bounding_box && (
                <Text size="sm">
                  {selectedFile.bounding_box.dimensions[0].toFixed(1)} x {selectedFile.bounding_box.dimensions[1].toFixed(1)} x {selectedFile.bounding_box.dimensions[2].toFixed(1)} mm
                </Text>
              )}
            </div>
            <div>
              <Text size="sm" c="dimmed">Volumen</Text>
              <Text size="sm">{selectedFile.volume ? (selectedFile.volume / 1000).toFixed(2) : '-'} cm³</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Dreiecke</Text>
              <Text size="sm">{selectedFile.triangle_count ? selectedFile.triangle_count.toLocaleString() : '-'}</Text>
            </div>
          </Group>
        )}
      </Modal>
    </Stack>
  );
}
