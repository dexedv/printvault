import { Component, ReactNode } from 'react';
import { Center, Stack, Text, Button, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Center h="100vh" bg="#f8fafc">
          <Stack align="center" gap="md" p="xl">
            <Title order={2} c="red">Etwas ist schief gelaufen</Title>
            <Text c="dimmed" ta="center" maw={400}>
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
            </Text>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={this.handleReset}
            >
              Erneut versuchen
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
