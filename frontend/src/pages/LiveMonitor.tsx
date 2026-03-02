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
} from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { printersApi, createPrinterWebSocket } from '../api/client';
import type { Printer, PrinterStatus } from '@shared/types';

export default function LiveMonitor() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<number | null>(null);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

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
