import { useEffect, useState, useRef } from 'react';
import { Progress, Text, Stack, Center, Title, RingProgress, ThemeIcon } from '@mantine/core';
import { IconCloudComputing, IconApi, IconCheck } from '@tabler/icons-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

interface Step {
  name: string;
  progress: number;
  status: 'pending' | 'loading' | 'complete' | 'error';
  icon: React.ReactNode;
}

// Check if we're in Tauri environment
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [steps, setSteps] = useState<Step[]>([
    { name: 'Anwendung wird geladen...', progress: 0, status: 'loading', icon: <IconCloudComputing size={24} /> },
    { name: 'Backend wird gestartet...', progress: 0, status: 'pending', icon: <IconCloudComputing size={24} /> },
    { name: 'API wird initialisiert...', progress: 0, status: 'pending', icon: <IconApi size={24} /> },
    { name: 'Bereit!', progress: 0, status: 'pending', icon: <IconCheck size={24} /> },
  ]);

  const [backendUrl, setBackendUrl] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    const initializeApp = async () => {
      try {
        // Step 1: App loading (simulate)
        await new Promise(resolve => setTimeout(resolve, 500));
        updateStep(0, 100, 'complete');

        // Step 2: Start backend (only in Tauri)
        setCurrentStep(1);
        updateStep(1, 30, 'loading');

        if (isTauri) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const url = await invoke<string>('start_backend');
            setBackendUrl(url);

            // Animate progress for backend startup
            for (let i = 30; i <= 70; i += 20) {
              await new Promise(resolve => setTimeout(resolve, 100));
              updateStep(1, i, 'loading');
            }

            // Wait a bit for backend to fully start
            await new Promise(resolve => setTimeout(resolve, 300));
            updateStep(1, 100, 'complete');

            // Step 3: Check API
            setCurrentStep(2);
            updateStep(2, 20, 'loading');

            let apiReady = false;
            for (let i = 0; i < 10; i++) {
              try {
                const isReady = await invoke<boolean>('check_backend');
                if (isReady) {
                  apiReady = true;
                  break;
                }
              } catch {
                // Backend not ready yet
              }
              await new Promise(resolve => setTimeout(resolve, 500));
              updateStep(2, 20 + (i * 8), 'loading');
            }

            updateStep(2, 100, 'complete');
          } catch (err) {
            console.error('Backend start error:', err);
            updateStep(1, 100, 'complete');
            updateStep(2, 100, 'complete');
          }
        } else {
          // Not in Tauri, skip backend
          updateStep(1, 100, 'complete');
          updateStep(2, 100, 'complete');
        }

        // Step 4: Complete
        setCurrentStep(3);
        updateStep(3, 100, 'complete');

        // Wait a moment then complete
        await new Promise(resolve => setTimeout(resolve, 300));
        onComplete();

      } catch (err) {
        console.error('Initialization error:', err);
        setError(String(err));
        // Still complete after error to allow app to load
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete();
      }
    };

    initializeApp();
  }, [onComplete]);

  const updateStep = (index: number, progress: number, status: Step['status']) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, progress, status } : step
    ));
  };

  const totalProgress = Math.round(
    steps.reduce((sum, step) => sum + step.progress, 0) / steps.length
  );

  const activeStep = steps.find(s => s.status === 'loading') || steps[steps.length - 1];

  return (
    <Center h="100vh" style={{ background: '#f8fafc' }}>
      <Stack align="center" gap="xl" p="xl" style={{ maxWidth: 500, width: '100%' }}>
        {/* Logo/Title */}
        <Stack align="center" gap="xs">
          <ThemeIcon size={80} radius="xl" variant="light" color="blue">
            <IconCloudComputing size={48} />
          </ThemeIcon>
          <Title order={2} c="dark">PrintVault</Title>
          <Text c="dimmed" size="sm">3D Print Management</Text>
        </Stack>

        {/* Progress Ring */}
        <RingProgress
          size={180}
          thickness={12}
          roundCaps
          sections={[{ value: totalProgress, color: 'blue' }]}
          label={
            <Center>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="blue">{totalProgress}%</Text>
                <Text size="xs" c="dimmed">wird geladen</Text>
              </Stack>
            </Center>
          }
        />

        {/* Steps */}
        <Stack gap="sm" w="100%">
          {steps.map((step, index) => (
            <Stack key={index} gap={4}>
              <Center gap="sm">
                <ThemeIcon
                  size={24}
                  radius="xl"
                  color={step.status === 'complete' ? 'green' : step.status === 'loading' ? 'blue' : step.status === 'error' ? 'red' : 'gray'}
                  variant={step.status === 'pending' ? 'outline' : 'filled'}
                >
                  {step.status === 'complete' ? <IconCheck size={14} /> : step.icon}
                </ThemeIcon>
                <Text
                  size="sm"
                  c={step.status === 'pending' ? 'dimmed' : step.status === 'error' ? 'red' : 'dark'}
                  fw={step.status === 'loading' ? 500 : 400}
                >
                  {step.name}
                </Text>
                {step.status === 'complete' && (
                  <Text size="xs" c="green" ml="auto">✓</Text>
                )}
              </Center>
              {step.status === 'loading' && (
                <Progress
                  value={step.progress}
                  size="xs"
                  color="blue"
                  animated
                  ml={36}
                />
              )}
            </Stack>
          ))}
        </Stack>

        {/* Error message */}
        {error && (
          <Text size="xs" c="red" ta="center">
            Warnung: {error}
          </Text>
        )}

        {/* Backend URL */}
        {backendUrl && (
          <Text size="xs" c="dimmed">
            Backend: {backendUrl}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
