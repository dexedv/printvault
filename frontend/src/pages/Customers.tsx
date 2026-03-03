import { useEffect, useState } from 'react';
import {
  Title,
  Card,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  Modal,
  Table,
  Badge,
  ActionIcon,
  Pagination,
  Alert,
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
  IconMail,
  IconPhone,
  IconBuilding,
  IconMapPin,
  IconNotes,
  IconUsers,
} from '@tabler/icons-react';
import { customersApi, Customer } from '../api/client';
import LimitExceededModal from '../components/LimitExceededModal';
import classes from './Customers.module.css';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
  });
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ resource: string; current: number; limit: number }>({ resource: 'customers', current: 0, limit: 0 });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customersApi.list({
        skip: (page - 1) * limit,
        limit,
        search: search || undefined,
      });
      setCustomers(data);

      // Get total count
      const allCustomers = await customersApi.list({ limit: 1000, search: search || undefined });
      setTotalCount(allCustomers.length);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    loadCustomers();
  };

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', company: '', address: '', notes: '' });
    openModal();
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    openModal();
  };

  const handleSubmit = async () => {
    try {
      if (editingCustomer?.id) {
        await customersApi.update(editingCustomer.id, formData);
      } else {
        await customersApi.create(formData);
      }
      closeModal();
      loadCustomers();
    } catch (err: any) {
      // Check if it's a limit error
      if (err.response?.status === 403 && err.response?.data?.detail?.includes('Limit')) {
        const msg = err.response.data.detail;
        const match = msg.match(/bereits (\d+) von maximal (\d+)/);
        setLimitInfo({
          resource: 'customers',
          current: match ? parseInt(match[1]) : customers.length,
          limit: match ? parseInt(match[2]) : 5
        });
        setLimitModalOpen(true);
      } else {
        console.error('Failed to save customer:', err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      try {
        await customersApi.delete(id);
        loadCustomers();
      } catch (err) {
        console.error('Failed to delete customer:', err);
      }
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <Stack gap="md">
      <Title order={2}>Kundenverwaltung</Title>

      <Card padding="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <TextInput
              placeholder="Suchen..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ width: 300 }}
            />
            <Button variant="light" onClick={handleSearch}>Suchen</Button>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openNewCustomer}>
            Neuer Kunde
          </Button>
        </Group>

        {loading ? (
          <Text c="dimmed" ta="center" py="xl">Laden...</Text>
        ) : customers.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md" p="xl">
              <Box className={classes.emptyIcon} style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconUsers size={36} color="#3b82f6" />
              </Box>
              <Text c="dimmed" size="lg">Keine Kunden gefunden</Text>
              <Button variant="light" onClick={openNewCustomer}>
                Neuen Kunden hinzufügen
              </Button>
            </Stack>
          </Center>
        ) : (
          <>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr style={{ background: '#f8fafc' }}>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Firma</Table.Th>
                  <Table.Th>E-Mail</Table.Th>
                  <Table.Th>Telefon</Table.Th>
                  <Table.Th>Erstellt</Table.Th>
                  <Table.Th style={{ width: 80 }}>Aktionen</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {customers.map((customer) => (
                  <Table.Tr key={customer.id} className={classes.tableRow}>
                    <Table.Td>
                      <Group gap="sm">
                        <Box
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconUser size={18} color="#3b82f6" />
                        </Box>
                        <Text fw={500}>{customer.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={customer.company ? 'dark' : 'dimmed'}>
                        {customer.company || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconMail size={14} color="#64748b" />
                        <Text size="sm" c={customer.email ? 'dark' : 'dimmed'}>
                          {customer.email || '-'}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconPhone size={14} color="#64748b" />
                        <Text size="sm" c={customer.phone ? 'dark' : 'dimmed'}>
                          {customer.phone || '-'}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString('de-DE') : '-'}
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
                            onClick={() => openEditCustomer(customer)}
                          >
                            Bearbeiten
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => customer.id && handleDelete(customer.id)}
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

      <Modal opened={modalOpened} onClose={closeModal} title={editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'} size="lg">
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Name des Kunden"
            required
            leftSection={<IconUser size={16} />}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <TextInput
            label="Firma"
            placeholder="Firmenname (optional)"
            leftSection={<IconBuilding size={16} />}
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.currentTarget.value })}
          />

          <Group grow>
            <TextInput
              label="E-Mail"
              placeholder="E-Mail-Adresse"
              leftSection={<IconMail size={16} />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.currentTarget.value })}
            />

            <TextInput
              label="Telefon"
              placeholder="Telefonnummer"
              leftSection={<IconPhone size={16} />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.currentTarget.value })}
            />
          </Group>

          <TextInput
            label="Adresse"
            placeholder="Adresse"
            leftSection={<IconMapPin size={16} />}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.currentTarget.value })}
          />

          <Textarea
            label="Notizen"
            placeholder="Zusätzliche Notizen..."
            leftSection={<IconNotes size={16} />}
            minRows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={closeModal}>Abbrechen</Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingCustomer ? 'Speichern' : 'Erstellen'}
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
