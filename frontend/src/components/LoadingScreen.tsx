import { useEffect, useState, useRef } from 'react';
import { Progress, Text, Stack, Center, Title, RingProgress, ThemeIcon, Box, Badge } from '@mantine/core';
import { IconCloudComputing, IconApi, IconCheck, IconPrinter, IconSettings, IconDatabase } from '@tabler/icons-react';

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
    { name: 'Anwendung wird geladen...', progress: 0, status: 'loading', icon: <IconPrinter size={24} /> },
    { name: 'Datenbank wird initialisiert...', progress: 0, status: 'pending', icon: <IconDatabase size={24} /> },
    { name: 'Backend wird gestartet...', progress: 0, status: 'pending', icon: <IconCloudComputing size={24} /> },
    { name: 'API wird initialisiert...', progress: 0, status: 'pending', icon: <IconApi size={24} /> },
    { name: 'Einstellungen werden geladen...', progress: 0, status: 'pending', icon: <IconSettings size={24} /> },
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
        await new Promise(resolve => setTimeout(resolve, 800));
        updateStep(0, 100, 'complete');

        // Step 2: Database initialization (simulate)
        setCurrentStep(1);
        updateStep(1, 20, 'loading');
        for (let i = 20; i <= 80; i += 15) {
          await new Promise(resolve => setTimeout(resolve, 150));
          updateStep(1, i, 'loading');
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        updateStep(1, 100, 'complete');

        // Step 3: Start backend (only in Tauri)
        setCurrentStep(2);
        updateStep(2, 30, 'loading');

        if (isTauri) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const url = await invoke<string>('start_backend');
            setBackendUrl(url);

            // Animate progress for backend startup
            for (let i = 30; i <= 70; i += 10) {
              await new Promise(resolve => setTimeout(resolve, 150));
              updateStep(2, i, 'loading');
            }

            // Wait a bit for backend to fully start
            await new Promise(resolve => setTimeout(resolve, 400));
            updateStep(2, 100, 'complete');

            // Step 4: Check API
            setCurrentStep(3);
            updateStep(3, 20, 'loading');

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
              await new Promise(resolve => setTimeout(resolve, 300));
              updateStep(3, 20 + (i * 8), 'loading');
            }

            updateStep(3, 100, 'complete');
          } catch (err) {
            console.error('Backend start error:', err);
            updateStep(2, 100, 'complete');
            updateStep(3, 100, 'complete');
          }
        } else {
          // Not in Tauri, skip backend
          updateStep(2, 100, 'complete');
          updateStep(3, 100, 'complete');
        }

        // Step 5: Load settings (simulate)
        setCurrentStep(4);
        updateStep(4, 30, 'loading');
        for (let i = 30; i <= 80; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          updateStep(4, i, 'loading');
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        updateStep(4, 100, 'complete');

        // Step 6: Complete
        setCurrentStep(5);
        updateStep(5, 100, 'complete');

        // Wait a moment then complete - show success animation
        await new Promise(resolve => setTimeout(resolve, 600));
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
    <Center h="100vh" style={{
      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
      minHeight: '100vh'
    }}>
      <Stack align="center" gap="xl" p="xl" style={{ maxWidth: 500, width: '100%' }}>
        {/* Logo/Title with animation */}
        <Stack align="center" gap="xs">
          <Box
            style={{
              width: 100,
              height: 100,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <IconPrinter size={56} color="white" />
          </Box>
          <Title order={1} c="white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>PrintVault</Title>
          <Badge size="lg" variant="white" color="blue">v1.1.2</Badge>
          <Text c="white" size="sm" opacity={0.8}>3D Print Management</Text>
        </Stack>

        {/* Progress Ring */}
        <RingProgress
          size={180}
          thickness={12}
          roundCaps
          sections={[{ value: totalProgress, color: 'white' }]}
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            backdropFilter: 'blur(10px)',
          }}
          label={
            <Center>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="white">{totalProgress}%</Text>
                <Text size="xs" c="white" opacity={0.8}>wird geladen</Text>
              </Stack>
            </Center>
          }
        />

        {/* Steps */}
        <Stack gap="sm" w="100%" style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 20,
          backdropFilter: 'blur(10px)',
        }}>
          {steps.map((step, index) => (
            <Stack key={index} gap={4}>
              <Center gap="sm">
                <ThemeIcon
                  size={24}
                  radius="xl"
                  color={step.status === 'complete' ? 'green' : step.status === 'loading' ? 'white' : step.status === 'error' ? 'red' : 'gray'}
                  variant={step.status === 'pending' ? 'outline' : 'filled'}
                  style={step.status === 'loading' ? { background: 'rgba(255,255,255,0.2)' } : {}}
                >
                  {step.status === 'complete' ? <IconCheck size={14} /> : step.icon}
                </ThemeIcon>
                <Text
                  size="sm"
                  c={step.status === 'pending' ? 'white' : step.status === 'error' ? 'red' : 'white'}
                  fw={step.status === 'loading' ? 500 : 400}
                  opacity={step.status === 'pending' ? 0.5 : 1}
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
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
              )}
            </Stack>
          ))}
        </Stack>

        {/* Error message */}
        {error && (
          <Text size="xs" c="red" ta="center" style={{ background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: 8 }}>
            Warnung: {error}
          </Text>
        )}

        {/* Backend URL */}
        {backendUrl && (
          <Text size="xs" c="white" opacity={0.7}>
            Backend: {backendUrl}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
