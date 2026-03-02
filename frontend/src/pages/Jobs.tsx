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
  Box,
} from '@mantine/core';
import { IconPrinter, IconClock, IconCheck, IconX, IconAlertTriangle, IconHistory } from '@tabler/icons-react';
import { jobsApi, printersApi } from '../api/client';
import type { PrintJob, Printer } from '@shared/types';
import classes from './Jobs.module.css';

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
        <Card padding="md" withBorder className={classes.statCard}>
          <Box style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <IconPrinter size={20} color="#3b82f6" />
          </Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Gesamt</Text>
          <Text size="xl" fw={700} c="dark">{stats.totalJobs}</Text>
          <Text size="xs" c="dimmed">Druckaufträge</Text>
        </Card>

        <Card padding="md" withBorder className={classes.statCard}>
          <Box style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <IconClock size={20} color="#f59e0b" />
          </Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Druckzeit</Text>
          <Text size="xl" fw={700} c="dark">{formatHours(stats.totalPrintHours)}</Text>
          <Text size="xs" c="dimmed">Gesamte Druckzeit</Text>
        </Card>

        <Card padding="md" withBorder className={classes.statCard}>
          <Box style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <IconCheck size={20} color="#22c55e" />
          </Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Erfolg</Text>
          <Text size="xl" fw={700} c="green">{stats.successRate.toFixed(1)}%</Text>
          <Text size="xs" c="dimmed">{stats.successCount} erfolgreich</Text>
        </Card>

        <Card padding="md" withBorder className={classes.statCard}>
          <Box style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <IconX size={20} color="#ef4444" />
          </Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Fehler</Text>
          <Text size="xl" fw={700} c="red">{stats.failureRate.toFixed(1)}%</Text>
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
          <Stack align="center" gap="md" p="xl">
            <Box className={classes.emptyIcon} style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconHistory size={36} color="#94a3b8" />
            </Box>
            <Text c="dimmed" size="lg">Keine Druckaufträge gefunden</Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="sm">
          {filteredJobs.map((job) => (
            <Card key={job.id} padding="md" withBorder className={classes.jobCard}>
              <Group justify="space-between">
                <Group gap="md">
                  <Box
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: job.status === 'completed' ? '#dcfce7'
                        : job.status === 'failed' ? '#fee2e2'
                        : job.status === 'printing' ? '#dbeafe'
                        : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {job.status === 'completed' ? (
                      <IconCheck size={20} color="#22c55e" />
                    ) : job.status === 'failed' ? (
                      <IconX size={20} color="#ef4444" />
                    ) : job.status === 'printing' ? (
                      <IconPrinter size={20} color="#3b82f6" />
                    ) : (
                      <IconClock size={20} color="#94a3b8" />
                    )}
                  </Box>
                  <div>
                    <Group gap="xs" mb={4}>
                      <Text fw={600} size="sm">{job.filename}</Text>
                      <Badge size="sm" color={getStatusColor(job.status)} variant="filled">
                        {job.status}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {getPrinterName(job.printer_id)} • {job.started_at ? new Date(job.started_at).toLocaleString('de-DE') : '-'}
                    </Text>
                  </div>
                </Group>
                <Group gap="xl">
                  <div style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed">Fortschritt</Text>
                    <Group gap="xs">
                      <Text fw={600}>{job.progress_percent.toFixed(1)}%</Text>
                      <Progress value={job.progress_percent} size="xs" w={60} radius="xl" />
                    </Group>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed">Dauer</Text>
                    <Text fw={500}>{formatDuration(job.duration_seconds)}</Text>
                  </div>
                  {(job.temperature_nozzle || job.temperature_bed) && (
                    <div style={{ textAlign: 'right' }}>
                      <Text size="xs" c="dimmed">Temperatur</Text>
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
