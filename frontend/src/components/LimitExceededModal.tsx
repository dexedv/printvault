import { Modal, Text, Button, Stack, ThemeIcon, Divider } from '@mantine/core';
import { IconAlertTriangle, IconCrown } from '@tabler/icons-react';

interface LimitExceededModalProps {
  opened: boolean;
  onClose: () => void;
  resource: string;
  current: number;
  limit: number;
}

export default function LimitExceededModal({
  opened,
  onClose,
  resource,
  current,
  limit
}: LimitExceededModalProps) {
  const resourceNames: Record<string, string> = {
    files: 'Dateien',
    projects: 'Projekte',
    filaments: 'Filamente',
    printers: 'Drucker',
    customers: 'Kunden',
    orders: 'Bestellungen',
  };

  const name = resourceNames[resource] || resource;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Stack gap={0}>
          <Text fw={700} size="lg">Limit erreicht!</Text>
        </Stack>
      }
      centered
      size="md"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack gap="md" align="center">
        <ThemeIcon size={60} radius="xl" color="red" variant="light">
          <IconAlertTriangle size={30} />
        </ThemeIcon>

        <Text size="md" ta="center" c="dimmed">
          Du hast bereits {current} von maximal {limit} {name} in der Free-Version.
        </Text>

        <Text size="sm" ta="center">
          Um unbegrenzt {name} zu erstellen, upgrade auf PrintVault Pro!
        </Text>

        <Divider my="sm" />

        <Stack gap="xs" w="100%">
          <Button
            fullWidth
            leftSection={<IconCrown size={18} />}
            color="blue"
            variant="filled"
            component="a"
            href="/settings"
            onClick={onClose}
          >
            Jetzt auf Pro upgraden
          </Button>
          <Button
            fullWidth
            variant="subtle"
            color="gray"
            onClick={onClose}
          >
            Später erinnern
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}
