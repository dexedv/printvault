import { useEffect, useState } from 'react';
import {
  Title,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Stack,
  Loader,
  Center,
  Group,
  Select,
} from '@mantine/core';
import { jobsApi, printersApi } from '../api/client';
import type { PrintJob, Printer } from '@shared/types';

export default function Jobs() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [printerFilter, setPrinterFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, printersData] = await Promise.all([
        jobsApi.list({ limit: 100 }),
        printersApi.list(),
      ]);
      setJobs(jobsData);
      setPrinters(printersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'gray',
      printing: 'blue',
      paused: 'yellow',
      completed: 'green',
      failed: 'red',
      cancelled: 'gray',
    };
    return colors[status] || 'gray';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const filteredJobs = jobs.filter((job) => {
    if (printerFilter && job.printer_id !== parseInt(printerFilter)) return false;
    if (statusFilter && job.status !== statusFilter) return false;
    return true;
  });

  const getPrinterName = (printerId: number) => {
    const printer = printers.find((p) => p.id === printerId);
    return printer?.name || `Printer #${printerId}`;
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
        <Title order={2}>Druckaufträge</Title>
        <Group>
          <Select
            placeholder="Nach Drucker filtern"
            value={printerFilter}
            onChange={setPrinterFilter}
            clearable
            data={printers.map((p) => ({ value: p.id.toString(), label: p.name }))}
            style={{ width: 180 }}
          />
          <Select
            placeholder="Nach Status filtern"
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            data={[
              { value: 'pending', label: 'Pending' },
              { value: 'printing', label: 'Printing' },
              { value: 'paused', label: 'Paused' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            style={{ width: 150 }}
          />
        </Group>
      </Group>

      {filteredJobs.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">Keine Druckaufträge gefunden</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {filteredJobs.map((job) => (
            <Card key={job.id} padding="sm" withBorder>
              <Group justify="space-between">
                <div>
                  <Group gap="xs" mb={4}>
                    <Text fw={500}>{job.filename}</Text>
                    <Badge size="sm" color={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {getPrinterName(job.printer_id)} • Started: {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                  </Text>
                </div>
                <Group gap="xl">
                  <div style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed">Progress</Text>
                    <Text fw={500}>{job.progress_percent.toFixed(1)}%</Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed">Duration</Text>
                    <Text fw={500}>{formatDuration(job.duration_seconds)}</Text>
                  </div>
                  {(job.temperature_nozzle || job.temperature_bed) && (
                    <div style={{ textAlign: 'right' }}>
                      <Text size="xs" c="dimmed">Temps</Text>
                      <Text size="sm" fw={500}>
                        {job.temperature_nozzle ? `${job.temperature_nozzle.toFixed(0)}°` : '-'} / {job.temperature_bed ? `${job.temperature_bed.toFixed(0)}°` : '-'}
                      </Text>
                    </div>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
