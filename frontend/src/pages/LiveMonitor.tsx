import { useEffect, useState, useRef } from 'react';
import {
  Title,
  Group,
  Card,
  Text,
  Badge,
  Stack,
  Loader,
  Center,
  Select,
  Button,
  Progress,
  Box,
  Tabs,
} from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay, IconX, IconTemperature, IconVideo } from '@tabler/icons-react';
import { printersApi, createPrinterWebSocket } from '../api/client';
import type { Printer, PrinterStatus } from '@shared/types';

// Temperature history component
function TemperatureChart({ temperatures }: { temperatures: Array<{ time: number; extruder: number; bed: number }> }) {
  if (temperatures.length < 2) return <Text size="sm" c="dimmed">Warte auf Temperaturdaten...</Text>;

  const maxTemp = Math.max(...temperatures.map(t => Math.max(t.extruder, t.bed)), 300);
  const width = 100;
  const height = 60;

  const extruderPath = temperatures.map((t, i) =>
    `${i === 0 ? 'M' : 'L'} ${(i / (temperatures.length - 1)) * width} ${height - (t.extruder / maxTemp) * height}`
  ).join(' ');

  const bedPath = temperatures.map((t, i) =>
    `${i === 0 ? 'M' : 'L'} ${(i / (temperatures.length - 1)) * width} ${height - (t.bed / maxTemp) * height}`
  ).join(' ');

  return (
    <Box>
      <svg width="100%" height={height + 20} viewBox={`0 0 ${width} ${height + 20}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line
            key={i}
            x1={0}
            y1={p * height}
            x2={width}
            y2={p * height}
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
        ))}
        {/* Bed line */}
        <path d={bedPath} fill="none" stroke="#f97316" strokeWidth={1.5} />
        {/* Extruder line */}
        <path d={extruderPath} fill="none" stroke="#ef4444" strokeWidth={1.5} />
      </svg>
      <Group gap="md" mt="xs">
        <Group gap="xs">
          <Box w={10} h={10} bg="red" style={{ borderRadius: 2 }} />
          <Text size="xs">Düse</Text>
        </Group>
        <Group gap="xs">
          <Box w={10} h={10} bg="orange" style={{ borderRadius: 2 }} />
          <Text size="xs">Bett</Text>
        </Group>
      </Group>
    </Box>
  );
}

export default function LiveMonitor() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<number | null>(null);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('webcam');
  const [temperatureHistory, setTemperatureHistory] = useState<Array<{ time: number; extruder: number; bed: number }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const historyRef = useRef<number[]>([]);

  const loadPrinters = async () => {
    try {
      const data = await printersApi.list();
      setPrinters(data);
      if (data.length > 0 && !selectedPrinter) {
        setSelectedPrinter(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  useEffect(() => {
    if (!selectedPrinter) return;

    // Disconnect existing
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnecting(true);

    // Create WebSocket connection
    const ws = createPrinterWebSocket(selectedPrinter);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status_update' && data.data) {
          setStatus(data.data);

          // Add temperature to history
          if (data.data.temperatures) {
            const now = Date.now();
            setTemperatureHistory(prev => {
              const newHistory = [
                ...prev,
                {
                  time: now,
                  extruder: data.data.temperatures.extruder?.actual || 0,
                  bed: data.data.temperatures.heater_bed?.actual || 0,
                }
              ].slice(-60); // Keep last 60 readings
              return newHistory;
            });
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setConnecting(false);
    };

    ws.onclose = () => {
      setConnecting(false);
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [selectedPrinter]);

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      printing: 'blue',
      idle: 'green',
      paused: 'yellow',
      complete: 'green',
      error: 'red',
    };
    return colors[state] || 'gray';
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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
        <Title order={2}>Live-Überwachung</Title>
        <Select
          placeholder="Drucker auswählen"
          value={selectedPrinter?.toString()}
          onChange={(v) => setSelectedPrinter(v ? parseInt(v) : null)}
          data={printers.map((p) => ({ value: p.id.toString(), label: p.name }))}
          style={{ width: 200 }}
        />
      </Group>

      {!selectedPrinter || printers.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">Keine Drucker verfügbar. Fügen Sie zuerst einen Drucker hinzu.</Text>
        </Center>
      ) : (
        <>
          {connecting && (
            <Center>
              <Badge color="yellow">Connecting...</Badge>
            </Center>
          )}

          {status ? (
            <>
              {/* Webcam / Temperature Tabs */}
              <Card padding="md" withBorder>
                <Tabs value={activeTab} onChange={setActiveTab}>
                  <Tabs.List>
                    <Tabs.Tab value="webcam" leftSection={<IconVideo size={16} />}>
                      Kamera
                    </Tabs.Tab>
                    <Tabs.Tab value="temperature" leftSection={<IconTemperature size={16} />}>
                      Temperatur
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="webcam" pt="md">
                    <Box
                      style={{
                        width: '100%',
                        height: 300,
                        background: '#1a1a1a',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text c="dimmed">
                        Webcam-Stream wird hier angezeigt
                        <br />
                        <Text size="xs">Konfigurieren Sie die Webcam-URL in den Drucker-Einstellungen</Text>
                      </Text>
                    </Box>
                  </Tabs.Panel>

                  <Tabs.Panel value="temperature" pt="md">
                    <Card padding="sm" withBorder>
                      <Text size="sm" fw={500} mb="sm">Temperaturverlauf</Text>
                      <TemperatureChart temperatures={temperatureHistory} />
                    </Card>
                  </Tabs.Panel>
                </Tabs>
              </Card>

              <Group align="flex-start" gap="md">
                <Card padding="md" withBorder style={{ flex: 1 }}>
                <Stack gap="md">
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" c="dimmed">Status</Text>
                      <Badge color={getStateColor(status.printer.state)} size="lg">
                        {status.printer.state}
                      </Badge>
                    </div>
                    {status.printer.filename && (
                      <div>
                        <Text size="sm" c="dimmed">File</Text>
                        <Text fw={500} truncate style={{ maxWidth: 200 }}>
                          {status.printer.filename}
                        </Text>
                      </div>
                    )}
                  </Group>

                  <div>
                    <Text size="sm" c="dimmed" mb="xs">Progress</Text>
                    <Group justify="space-between" mb="xs">
                      <Text fw={500}>{status.progress.toFixed(1)}%</Text>
                      <Text size="sm" c="dimmed">
                        {formatDuration(status.printer.print_duration)} / {formatDuration(status.printer.total_duration)}
                      </Text>
                    </Group>
                    <Progress value={status.progress} size="lg" color="blue" />
                  </div>

                  {status.layer.total > 0 && (
                    <div>
                      <Text size="sm" c="dimmed">Layer</Text>
                      <Text fw={500}>{status.layer.current} / {status.layer.total}</Text>
                    </div>
                  )}

                  <Group>
                    <Button variant="light" leftSection={<IconPlayerPause size={18} />} disabled>
                      Pause
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconX size={18} />} disabled>
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </Card>

              <Card padding="md" withBorder style={{ width: 280 }}>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed" mb="xs">Nozzle</Text>
                    <Group gap="xs">
                      <Box
                        style={{
                          width: 80,
                          height: 60,
                          background: '#f8fafc',
                          borderRadius: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text size="lg" fw={700} c={status.temperatures.extruder.actual > status.temperatures.extruder.target ? 'red' : 'blue'}>
                          {status.temperatures.extruder.actual.toFixed(0)}°
                        </Text>
                        <Text size="xs" c="dimmed">/ {status.temperatures.extruder.target.toFixed(0)}°</Text>
                      </Box>
                    </Group>
                  </div>

                  <div>
                    <Text size="sm" c="dimmed" mb="xs">Bed</Text>
                    <Box
                      style={{
                        width: 80,
                        height: 60,
                        background: '#f8fafc',
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text size="lg" fw={700} c={status.temperatures.heater_bed.actual > status.temperatures.heater_bed.target ? 'red' : 'blue'}>
                        {status.temperatures.heater_bed.actual.toFixed(0)}°
                      </Text>
                      <Text size="xs" c="dimmed">/ {status.temperatures.heater_bed.target.toFixed(0)}°</Text>
                    </Box>
                  </div>
                </Stack>
              </Card>
            </Group>
            </>
          ) : (
            <Center py="xl">
              <Text c="dimmed">Warte auf Druckerdaten...</Text>
            </Center>
          )}
        </>
      )}
    </Stack>
  );
}
