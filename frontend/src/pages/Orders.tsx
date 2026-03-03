import { useEffect, useState } from 'react';
import {
  Title,
  Card,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Textarea,
  Modal,
  Table,
  Badge,
  ActionIcon,
  Pagination,
  Alert,
  Progress,
  NumberInput,
  FileButton,
  Box,
  Menu,
  Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconDots,
  IconUser,
  IconFile,
  IconPlusMinus,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconShoppingCart,
} from '@tabler/icons-react';
import { ordersApi, customersApi, Order, Customer } from '../api/client';
import LimitExceededModal from '../components/LimitExceededModal';
import classes from './Orders.module.css';

const statusColors: Record<string, string> = {
  pending: 'yellow',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
};

const statusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Abgebrochen',
};

const priorityColors: Record<string, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

const priorityLabels: Record<string, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  urgent: 'Dringend',
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    quantity: 1,
    stl_filename: '',
    stl_file_path: '',
    stl_volume: 0,
    filament_type: '',
    filament_color: '',
    price: 0,
    priority: 'normal',
    due_date: '',
    notes: '',
    status: 'pending',
  });
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ resource: string; current: number; limit: number }>({ resource: 'orders', current: 0, limit: 0 });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.list({
        skip: (page - 1) * limit,
        limit,
        status: statusFilter || undefined,
      });
      setOrders(data);

      // Get total count
      const allOrders = await ordersApi.list({ limit: 1000, status: statusFilter || undefined });
      setTotalCount(allOrders.length);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customersApi.list({ limit: 1000 });
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, [page, statusFilter]);

  const openNewOrder = () => {
    setEditingOrder(null);
    setFormData({
      customer_id: '',
      quantity: 1,
      stl_filename: '',
      stl_file_path: '',
      stl_volume: 0,
      filament_type: '',
      filament_color: '',
      price: 0,
      priority: 'normal',
      due_date: '',
      notes: '',
      status: 'pending',
    });
    openModal();
  };

  const openEditOrder = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customer_id: order.customer_id.toString(),
      quantity: order.quantity,
      stl_filename: order.stl_filename || '',
      stl_file_path: order.stl_file_path || '',
      stl_volume: order.stl_volume || 0,
      filament_type: order.filament_type || '',
      filament_color: order.filament_color || '',
      price: order.price || 0,
      priority: order.priority,
      due_date: order.due_date ? order.due_date.split('T')[0] : '',
      notes: order.notes || '',
      status: order.status,
    });
    openModal();
  };

  const handleSubmit = async () => {
    try {
      const orderData = {
        customer_id: parseInt(formData.customer_id),
        quantity: formData.quantity,
        stl_filename: formData.stl_filename || null,
        stl_file_path: formData.stl_file_path || null,
        stl_volume: formData.stl_volume || null,
        filament_type: formData.filament_type || null,
        filament_color: formData.filament_color || null,
        price: formData.price || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        status: formData.status,
      };

      if (editingOrder?.id) {
        await ordersApi.update(editingOrder.id, orderData);
      } else {
        await ordersApi.create(orderData);
      }
      closeModal();
      loadOrders();
    } catch (err: any) {
      // Check if it's a limit error
      if (err.response?.status === 403 && err.response?.data?.detail?.includes('Limit')) {
        const msg = err.response.data.detail;
        const match = msg.match(/bereits (\d+) von maximal (\d+)/);
        setLimitInfo({
          resource: 'orders',
          current: match ? parseInt(match[1]) : orders.length,
          limit: match ? parseInt(match[2]) : 3
        });
        setLimitModalOpen(true);
      } else {
        console.error('Failed to save order:', err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Möchten Sie diesen Auftrag wirklich löschen?')) {
      try {
        await ordersApi.delete(id);
        loadOrders();
      } catch (err) {
        console.error('Failed to delete order:', err);
      }
    }
  };

  const handleIncrement = async (order: Order) => {
    if (!order.id) return;
    try {
      await ordersApi.incrementPrinted(order.id);
      loadOrders();
    } catch (err) {
      console.error('Failed to increment:', err);
    }
  };

  const handleDecrement = async (order: Order) => {
    if (!order.id) return;
    try {
      await ordersApi.decrementPrinted(order.id);
      loadOrders();
    } catch (err) {
      console.error('Failed to decrement:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <IconCheck size={14} />;
      case 'cancelled':
        return <IconX size={14} />;
      case 'in_progress':
        return <IconClock size={14} />;
      default:
        return <IconAlertTriangle size={14} />;
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Stack gap="md">
      <Title order={2}>Auftragsverwaltung</Title>

      <Card padding="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <Select
              placeholder="Status filtern"
              clearable
              leftSection={<IconSearch size={16} />}
              value={statusFilter}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
              data={[
                { value: 'pending', label: 'Ausstehend' },
                { value: 'in_progress', label: 'In Bearbeitung' },
                { value: 'completed', label: 'Abgeschlossen' },
                { value: 'cancelled', label: 'Abgebrochen' },
              ]}
              style={{ width: 200 }}
            />
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openNewOrder}>
            Neuer Auftrag
          </Button>
        </Group>

        {loading ? (
          <Text c="dimmed" ta="center" py="xl">Laden...</Text>
        ) : orders.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md" p="xl">
              <Box className={classes.emptyIcon} style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconShoppingCart size={36} color="#f59e0b" />
              </Box>
              <Text c="dimmed" size="lg">Keine Aufträge gefunden</Text>
              <Button variant="light" onClick={openNewOrder}>
                Neuen Auftrag erstellen
              </Button>
            </Stack>
          </Center>
        ) : (
          <>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr style={{ background: '#f8fafc' }}>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Kunde</Table.Th>
                  <Table.Th>STL Datei</Table.Th>
                  <Table.Th>Menge</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Priorität</Table.Th>
                  <Table.Th>Preis</Table.Th>
                  <Table.Th style={{ width: 100 }}>Aktionen</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((order) => (
                  <Table.Tr key={order.id} className={classes.tableRow}>
                    <Table.Td>
                      <Badge variant="light" color="gray">#{order.id}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconUser size={16} color="#3b82f6" />
                        </Box>
                        <Text size="sm" fw={500}>{order.customer_name || `Kunde ${order.customer_id}`}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {order.stl_filename ? (
                        <Group gap="xs">
                          <IconFile size={14} color="#64748b" />
                          <Text size="sm" lineClamp={1} style={{ maxWidth: 150 }}>
                            {order.stl_filename}
                          </Text>
                        </Group>
                      ) : (
                        <Text c="dimmed" size="sm">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => handleDecrement(order)}
                          disabled={order.printed_count === 0 || order.status === 'completed'}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                        <Text fw={600} mx="xs" size="sm">
                          {order.printed_count}/{order.quantity}
                        </Text>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="green"
                          onClick={() => handleIncrement(order)}
                          disabled={order.printed_count >= order.quantity || order.status === 'cancelled'}
                        >
                          <IconCheck size={12} />
                        </ActionIcon>
                      </Group>
                      <Progress
                        value={(order.printed_count / order.quantity) * 100}
                        size="xs"
                        mt={4}
                        radius="xl"
                        color={order.printed_count >= order.quantity ? 'green' : 'blue'}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={statusColors[order.status] || 'gray'}
                        variant="filled"
                        leftSection={getStatusIcon(order.status)}
                      >
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={priorityColors[order.priority] || 'gray'} variant="light">
                        {priorityLabels[order.priority] || order.priority}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} c={order.price ? 'dark' : 'dimmed'}>
                        {order.price ? `${order.price.toFixed(2)} €` : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={150}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => openEditOrder(order)}
                          >
                            Bearbeiten
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => order.id && handleDelete(order.id)}
                          >
                            Löschen
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination total={totalPages} value={page} onChange={setPage} />
              </Group>
            )}
          </>
        )}
      </Card>

      <Modal opened={modalOpened} onClose={closeModal} title={editingOrder ? 'Auftrag bearbeiten' : 'Neuer Auftrag'} size="lg">
        <Stack gap="md">
          <Select
            label="Kunde"
            placeholder="Kunde auswählen"
            required
            leftSection={<IconUser size={16} />}
            data={customers.map(c => ({ value: c.id?.toString() || '', label: c.name }))}
            value={formData.customer_id}
            onChange={(value) => setFormData({ ...formData, customer_id: value || '' })}
            searchable
          />

          <Group grow>
            <NumberInput
              label="Menge"
              placeholder="Anzahl zu druckender Teile"
              required
              min={1}
              value={formData.quantity}
              onChange={(value) => setFormData({ ...formData, quantity: Number(value) || 1 })}
            />

            <Select
              label="Priorität"
              data={[
                { value: 'low', label: 'Niedrig' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'Hoch' },
                { value: 'urgent', label: 'Dringend' },
              ]}
              value={formData.priority}
              onChange={(value) => setFormData({ ...formData, priority: value || 'normal' })}
            />
          </Group>

          <TextInput
            label="STL Dateiname"
            placeholder="z.B. halterung.stl"
            leftSection={<IconFile size={16} />}
            value={formData.stl_filename}
            onChange={(e) => setFormData({ ...formData, stl_filename: e.currentTarget.value })}
          />

          <TextInput
            label="STL Dateipfad"
            placeholder="C:/Druckdateien/model.stl"
            leftSection={<IconFile size={16} />}
            value={formData.stl_file_path}
            onChange={(e) => setFormData({ ...formData, stl_file_path: e.currentTarget.value })}
          />

          <Group grow>
            <NumberInput
              label="Volumen (cm³)"
              placeholder="Volumen des Modells"
              min={0}
              precision={2}
              value={formData.stl_volume}
              onChange={(value) => setFormData({ ...formData, stl_volume: Number(value) || 0 })}
            />

            <NumberInput
              label="Preis (€)"
              placeholder="Preis für den Auftrag"
              min={0}
              precision={2}
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: Number(value) || 0 })}
            />
          </Group>

          <Group grow>
            <Select
              label="Filamenttyp"
              placeholder="z.B. PLA, PETG"
              data={['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PP', 'PVB', 'Other']}
              value={formData.filament_type}
              onChange={(value) => setFormData({ ...formData, filament_type: value || '' })}
            />

            <TextInput
              label="Filamentfarbe"
              placeholder="z.B. Rot, #FF0000"
              value={formData.filament_color}
              onChange={(e) => setFormData({ ...formData, filament_color: e.currentTarget.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Lieferdatum"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.currentTarget.value })}
            />

            <Select
              label="Status"
              data={[
                { value: 'pending', label: 'Ausstehend' },
                { value: 'in_progress', label: 'In Bearbeitung' },
                { value: 'completed', label: 'Abgeschlossen' },
                { value: 'cancelled', label: 'Abgebrochen' },
              ]}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value || 'pending' })}
            />
          </Group>

          <Textarea
            label="Notizen"
            placeholder="Zusätzliche Notizen..."
            minRows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={!formData.customer_id}>
              {editingOrder ? 'Speichern' : 'Erstellen'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <LimitExceededModal
        opened={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        resource={limitInfo.resource}
        current={limitInfo.current}
        limit={limitInfo.limit}
      />
    </Stack>
  );
}
