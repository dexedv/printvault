import { useEffect, useState, useMemo } from 'react';
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
  Progress,
  RingProgress,
  Paper,
} from '@mantine/core';
import { IconPrinter, IconClock, IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
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
        jobsApi.list({ limit: 500 }),
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

  // Calculate statistics
  const stats = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');
    const cancelledJobs = jobs.filter(j => j.status === 'cancelled');
    const totalJobs = jobs.length;
    const successCount = completedJobs.length;
    const failedCount = failedJobs.length;

    // Total print time (in hours)
    const totalPrintTime = jobs.reduce((acc, job) => acc + (job.duration_seconds || 0), 0);
    const totalPrintHours = totalPrintTime / 3600;

    // Average print time
    const avgPrintTime = totalJobs > 0 ? totalPrintTime / totalJobs : 0;

    // Success rate
    const completedOrFailed = successCount + failedCount;
    const successRate = completedOrFailed > 0 ? (successCount / completedOrFailed) * 100 : 0;

    // Failure rate
    const failureRate = completedOrFailed > 0 ? (failedCount / completedOrFailed) * 100 : 0;

    // Average filament used (estimated based on duration and typical print)
    const avgFilamentGrams = totalJobs > 0 ? (totalPrintTime / 3600) * 15 : 0; // ~15g per hour estimate

    // Jobs per printer
    const jobsPerPrinter = printers.map(printer => ({
      name: printer.name,
      count: jobs.filter(j => j.printer_id === printer.id).length,
      completed: jobs.filter(j => j.printer_id === printer.id && j.status === 'completed').length,
    }));

    // Recent activity (last 7 days)
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const jobsPerDay = last7Days.map(date => ({
      date,
      count: jobs.filter(j => j.started_at?.startsWith(date)).length,
    }));

    return {
      totalJobs,
      successCount,
      failedCount,
      cancelledCount: cancelledJobs.length,
      totalPrintHours,
      avgPrintTime,
      successRate,
      failureRate,
      avgFilamentGrams,
      jobsPerPrinter,
      jobsPerDay,
    };
  }, [jobs, printers]);

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

  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <Stack gap="md">
      {/* Statistics Cards */}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Card padding="sm" withBorder>
          <Group gap="xs" mb="xs">
            <IconPrinter size={18} color="#2563eb" />
            <Text size="xs" c="dimmed">Gesamt</Text>
          </Group>
          <Text size="xl" fw={700}>{stats.totalJobs}</Text>
          <Text size="xs" c="dimmed">Druckaufträge</Text>
        </Card>

        <Card padding="sm" withBorder>
          <Group gap="xs" mb="xs">
            <IconClock size={18} color="#2563eb" />
            <Text size="xs" c="dimmed">Druckzeit</Text>
          </Group>
          <Text size="xl" fw={700}>{formatHours(stats.totalPrintHours)}</Text>
          <Text size="xs" c="dimmed">Gesamte Druckzeit</Text>
        </Card>

        <Card padding="sm" withBorder>
          <Group gap="xs" mb="xs">
            <IconCheck size={18} color="#10b981" />
            <Text size="xs" c="dimmed">Erfolg</Text>
          </Group>
          <Text size="xl" fw={700}>{stats.successRate.toFixed(1)}%</Text>
          <Text size="xs" c="dimmed">{stats.successCount} erfolgreich</Text>
        </Card>

        <Card padding="sm" withBorder>
          <Group gap="xs" mb="xs">
            <IconX size={18} color="#ef4444" />
            <Text size="xs" c="dimmed">Fehler</Text>
          </Group>
          <Text size="xl" fw={700}>{stats.failureRate.toFixed(1)}%</Text>
          <Text size="xs" c="dimmed">{stats.failedCount} fehlgeschlagen</Text>
        </Card>
      </SimpleGrid>

      {/* Success Rate Ring */}
      <Card padding="md" withBorder>
        <Group justify="space-between">
          <div>
            <Text fw={500} mb="xs">Erfolgsquote</Text>
            <Group gap="xl">
              <div>
                <Text size="xs" c="dimmed">Erfolgreich</Text>
                <Text fw={500} c="green">{stats.successCount}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Fehlgeschlagen</Text>
                <Text fw={500} c="red">{stats.failedCount}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Abgebrochen</Text>
                <Text fw={500} c="gray">{stats.cancelledCount}</Text>
              </div>
            </Group>
          </div>
          <RingProgress
            size={100}
            thickness={10}
            roundCaps
            sections={[
              { value: stats.successRate, color: 'green' },
              { value: stats.failureRate, color: 'red' },
              { value: (stats.cancelledCount / (stats.totalJobs || 1)) * 100, color: 'gray' },
            ]}
            label={
              <Text size="sm" fw={700} ta="center">
                {stats.successRate.toFixed(0)}%
              </Text>
            }
          />
        </Group>
      </Card>

      {/* Recent Activity Chart (simple text representation) */}
      {stats.totalJobs > 0 && (
        <Card padding="md" withBorder>
          <Text fw={500} mb="md">Aktivität (letzte 7 Tage)</Text>
          <Group gap="xs" align="flex-end" h={60}>
            {stats.jobsPerDay.map((day, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: `${Math.max(4, (day.count / Math.max(...stats.jobsPerDay.map(d => d.count), 1)) * 50)}px` }}>
                  <Paper
                    bg={day.count > 0 ? 'blue' : 'gray'}
                    style={{ width: '100%', height: '100%', minHeight: '4px', borderRadius: 2 }}
                  />
                </div>
                <Text size="xs" c="dimmed" mt={4}>
                  {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' })}
                </Text>
                <Text size="xs">{day.count}</Text>
              </div>
            ))}
          </Group>
        </Card>
      )}

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
