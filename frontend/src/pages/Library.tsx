import { useEffect, useState } from 'react';
import { TextInput, SimpleGrid, Card, Image, Text, Badge, ActionIcon, Menu, Select, Stack, Loader, Center, Box, Modal, Button, Group, ThemeIcon, Paper } from '@mantine/core';
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
  IconStack2,
  IconFileTypeSvg,
  IconBox,
  IconCube,
} from '@tabler/icons-react';
import { useFilesStore } from '../store';
import { filesApi } from '../api/client';
import ModelViewer from '../components/ModelViewer';
import classes from './Library.module.css';

const FILE_TYPE_GRADIENTS: Record<string, string> = {
  stl: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  '3mf': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  gcode: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  step: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
};

const FILE_TYPE_COLORS: Record<string, string> = {
  stl: '#3b82f6',
  '3mf': '#22c55e',
  gcode: '#f97316',
  step: '#8b5cf6',
};

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

  const getFileTypeColor = (type: string) => FILE_TYPE_COLORS[type] || '#6b7280';
  const getFileTypeGradient = (type: string) => FILE_TYPE_GRADIENTS[type] || FILE_TYPE_GRADIENTS.stl;

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
            <Text size="xl" fw={700} c="dark">Dateibibliothek</Text>
            <Text size="sm" c="dimmed">{files.length} Dateien</Text>
          </div>
        </Group>
        <Button leftSection={<IconUpload size={18} />} onClick={handleUpload} loading={uploading} size="md">
          Dateien hochladen
        </Button>
      </Group>

      {/* Search and Filters */}
      <Group>
        <TextInput
          placeholder="Dateien suchen..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 300 }}
          radius="md"
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
          radius="md"
        />
      </Group>

      {error && <Text c="red" size="sm">{error}</Text>}

      {/* File Grid */}
      {filteredFiles.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="md" p="xl">
            <Box
              style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <Icon3dCubeSphere size={48} color="#94a3b8" />
            </Box>
            <Text c="dimmed" size="lg">Keine Dateien in der Bibliothek</Text>
            <Button variant="light" onClick={handleUpload}>
              Erste Datei hochladen
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md" verticalSpacing="md">
          {filteredFiles.map((file) => {
            const typeColor = getFileTypeColor(file.file_type);
            const typeGradient = getFileTypeGradient(file.file_type);

            return (
              <Card
                key={file.id}
                padding={0}
                withBorder
                className={classes.card}
                style={{
                  overflow: 'hidden',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Gradient header with icon */}
                <Box
                  style={{
                    height: 80,
                    background: typeGradient,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
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

                  <Center style={{ height: '100%' }}>
                    <Box
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {file.file_type === 'stl' && <IconCube size={32} color="white" />}
                      {file.file_type === '3mf' && <IconBox size={32} color="white" />}
                      {file.file_type === 'gcode' && <IconFileTypeSvg size={32} color="white" />}
                      {file.file_type === 'step' && <Icon3dCubeSphere size={32} color="white" />}
                    </Box>
                  </Center>

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
                    {file.file_type.toUpperCase()}
                  </Badge>
                </Box>

                {/* Thumbnail */}
                <Box
                  style={{
                    height: 140,
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                  onClick={() => { setSelectedFile(file); openViewer(); }}
                >
                  {file.thumbnail_path ? (
                    <Image
                      src={`http://localhost:8000/${file.thumbnail_path}`}
                      alt={file.original_name}
                      h={140}
                      fit="cover"
                      w="100%"
                      className={classes.thumbnail}
                    />
                  ) : (
                    <Icon3dCubeSphere size={48} color="#cbd5e1" />
                  )}
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconEye size={16} color="white" />
                  </Box>
                </Box>

                {/* Info */}
                <Box p="md">
                  <Text fw={600} size="sm" mb="xs" lineClamp={1} style={{ color: '#1e293b' }}>
                    {file.original_name}
                  </Text>

                  <Paper p="xs" style={{ background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                    <Group gap="xs">
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
                  </Paper>

                  <Menu shadow="lg" width={150} position="bottom-end" withArrow>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="sm" style={{ position: 'absolute', bottom: 12, right: 12 }}>
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown style={{ border: '1px solid #e2e8f0' }}>
                      <Menu.Item leftSection={<IconEye size={14} />} onClick={() => { setSelectedFile(file); openViewer(); }}>
                        Vorschau
                      </Menu.Item>
                      <Menu.Item leftSection={<IconDownload size={14} />}>
                        Herunterladen
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(file.id)}>
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
                <Text size="sm" fw={500}>
                  {selectedFile.bounding_box.dimensions[0].toFixed(1)} x {selectedFile.bounding_box.dimensions[1].toFixed(1)} x {selectedFile.bounding_box.dimensions[2].toFixed(1)} mm
                </Text>
              )}
            </div>
            <div>
              <Text size="sm" c="dimmed">Volumen</Text>
              <Text size="sm" fw={500}>{selectedFile.volume ? (selectedFile.volume / 1000).toFixed(2) : '-'} cm³</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Dreiecke</Text>
              <Text size="sm" fw={500}>{selectedFile.triangle_count ? selectedFile.triangle_count.toLocaleString() : '-'}</Text>
            </div>
          </Group>
        )}
      </Modal>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
      `}</style>
    </Stack>
  );
}
