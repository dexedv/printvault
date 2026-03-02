import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type {
  Project,
  ProjectVersion,
  File,
  Filament,
  PrintProfile,
  Printer,
  PrintJob,
  PrinterStatus,
} from '@shared/types';

// Get API URL - try Tauri first, otherwise use default
const getApiBaseUrl = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const backendUrl = await invoke<string>('get_backend_url');
    return `${backendUrl}/api/v1`;
  } catch {
    // Not in Tauri, use default
    return 'http://localhost:8000/api/v1';
  }
};

// Dynamic API URL
let API_BASE_URL = 'http://localhost:8000/api/v1';

// Initialize API URL
getApiBaseUrl().then(url => {
  API_BASE_URL = url;
});

// Export function to get current API URL
export const getApiUrl = () => API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      console.error(`[API] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('[API] No response received:', error.message);
    }
    return Promise.reject(error);
  }
);

// Projects API
export const projectsApi = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    apiClient.get<Project[]>('/projects', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string; tags?: string }) =>
    apiClient.post<Project>('/projects', data).then((r) => r.data),

  update: (id: number, data: Partial<Project>) =>
    apiClient.patch<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),

  getVersions: (projectId: number) =>
    apiClient.get<ProjectVersion[]>(`/projects/${projectId}/versions`).then((r) => r.data),

  uploadVersion: (projectId: number, file: File, notes?: string) => {
    const formData = new FormData();
    formData.append('file', file as any);
    if (notes) formData.append('notes', notes);
    return apiClient.post<ProjectVersion>(`/projects/${projectId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

// Files API
export const filesApi = {
  list: (params?: { skip?: number; limit?: number; search?: string; file_type?: string }) =>
    apiClient.get<File[]>('/files', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<File>(`/files/${id}`).then((r) => r.data),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file as any);
    return apiClient.post<File>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  delete: (id: number) =>
    apiClient.delete(`/files/${id}`).then((r) => r.data),
};

// Filaments API
export const filamentsApi = {
  list: (params?: { skip?: number; limit?: number; material?: string; low_stock?: boolean }) =>
    apiClient.get<Filament[]>('/filaments', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Filament>(`/filaments/${id}`).then((r) => r.data),

  create: (data: Partial<Filament>) =>
    apiClient.post<Filament>('/filaments', data).then((r) => r.data),

  update: (id: number, data: Partial<Filament>) =>
    apiClient.patch<Filament>(`/filaments/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/filaments/${id}`).then((r) => r.data),

  checkLowStock: () =>
    apiClient.get<{ count: number; filaments: Filament[] }>('/filaments/low-stock/check').then((r) => r.data),
};

// Profiles API
export const profilesApi = {
  list: (params?: { skip?: number; limit?: number; material?: string }) =>
    apiClient.get<PrintProfile[]>('/profiles', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<PrintProfile>(`/profiles/${id}`).then((r) => r.data),

  create: (data: Partial<PrintProfile>) =>
    apiClient.post<PrintProfile>('/profiles', data).then((r) => r.data),

  update: (id: number, data: Partial<PrintProfile>) =>
    apiClient.patch<PrintProfile>(`/profiles/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/profiles/${id}`).then((r) => r.data),

  getDefault: (material: string) =>
    apiClient.get<PrintProfile>(`/profiles/defaults/${material}`).then((r) => r.data),
};

// Printers API
export const printersApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    apiClient.get<Printer[]>('/printers', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Printer>(`/printers/${id}`).then((r) => r.data),

  create: (data: Partial<Printer>) =>
    apiClient.post<Printer>('/printers', data).then((r) => r.data),

  update: (id: number, data: Partial<Printer>) =>
    apiClient.patch<Printer>(`/printers/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/printers/${id}`).then((r) => r.data),

  connect: (id: number) =>
    apiClient.post<{ connected: boolean; status?: PrinterStatus; error?: string }>(
      `/printers/${id}/connect`
    ).then((r) => r.data),

  getStatus: (id: number) =>
    apiClient.get<PrinterStatus>(`/printers/${id}/status`).then((r) => r.data),

  getWebcam: (id: number) =>
    apiClient.get<{ url: string; stream_url: string; name: string; enabled: boolean }>(`/printers/${id}/webcam`).then((r) => r.data),
};

// Jobs API
export const jobsApi = {
  list: (params?: { skip?: number; limit?: number; printer_id?: number; status?: string }) =>
    apiClient.get<PrintJob[]>('/jobs', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<PrintJob>(`/jobs/${id}`).then((r) => r.data),

  create: (data: Partial<PrintJob>) =>
    apiClient.post<PrintJob>('/jobs', data).then((r) => r.data),

  update: (id: number, data: Partial<PrintJob>) =>
    apiClient.patch<PrintJob>(`/jobs/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/jobs/${id}`).then((r) => r.data),
};

// Slicing API
export const slicingApi = {
  getSlicers: () =>
    apiClient.get<Record<string, string>>('/slicing/slicers').then((r) => r.data),

  slice: (data: { file_path: string; profile_id: number; slicer: string }) =>
    apiClient.post<{ success: boolean; gcode_path?: string; estimated_time?: number; error?: string }>(
      '/slicing/slice',
      data
    ).then((r) => r.data),

  getProfiles: () =>
    apiClient.get('/slicing/profiles').then((r) => r.data),
};

// Extensions API
export const extensionsApi = {
  list: () =>
    apiClient.get<Array<{ id: string; name: string; description: string; version: string; enabled: boolean }>>(
      '/extensions'
    ).then((r) => r.data),

  enable: (id: string) =>
    apiClient.post(`/extensions/${id}/enable`).then((r) => r.data),

  disable: (id: string) =>
    apiClient.post(`/extensions/${id}/disable`).then((r) => r.data),

  // OctoPrint
  getOctoPrintServers: () =>
    apiClient.get<Array<{ name: string; host: string; port: number }>>('/extensions/octoprint/servers').then((r) => r.data),

  addOctoPrintServer: (data: { name: string; host: string; port: number; api_key: string }) =>
    apiClient.post('/extensions/octoprint/servers', data).then((r) => r.data),

  removeOctoPrintServer: (name: string) =>
    apiClient.delete(`/extensions/octoprint/servers/${name}`).then((r) => r.data),

  // Bambu Lab
  getBambuPrinters: () =>
    apiClient.get<Array<{ name: string; host: string; serial: string; region: string }>>('/extensions/bambulab/printers').then((r) => r.data),

  addBambuPrinter: (data: { name: string; host: string; serial: string; access_code: string; region: string }) =>
    apiClient.post('/extensions/bambulab/printers', data).then((r) => r.data),

  removeBambuPrinter: (name: string) =>
    apiClient.delete(`/extensions/bambulab/printers/${name}`).then((r) => r.data),

  // Timelapse
  getTimelapseSessions: () =>
    apiClient.get('/extensions/timelapse/sessions').then((r) => r.data),

  createTimelapseSession: (data: { name: string; frame_interval: number; fps: number }) =>
    apiClient.post('/extensions/timelapse/sessions', data).then((r) => r.data),

  // Cloud Print
  getCloudProviders: () =>
    apiClient.get('/extensions/cloudprint/providers').then((r) => r.data),
};

// System API
export const systemApi = {
  getLogs: () =>
    apiClient.get<{ logs: string }>('/system/logs').then((r) => r.data),

  clearLogs: () =>
    apiClient.post('/system/logs/clear').then((r) => r.data),
};

// Customers API
export interface Customer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const customersApi = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    apiClient.get<Customer[]>('/customers', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    apiClient.post<Customer>('/customers', data).then((r) => r.data),

  update: (id: number, data: Partial<Customer>) =>
    apiClient.patch<Customer>(`/customers/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/customers/${id}`).then((r) => r.data),
};

// Orders API
export interface Order {
  id?: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  status: string;
  quantity: number;
  printed_count: number;
  stl_file_path?: string;
  stl_filename?: string;
  stl_volume?: number;
  filament_type?: string;
  filament_color?: string;
  price?: number;
  priority: string;
  due_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const ordersApi = {
  list: (params?: { skip?: number; limit?: number; status?: string; customer_id?: number; priority?: string }) =>
    apiClient.get<Order[]>('/orders', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  create: (data: Partial<Order>) =>
    apiClient.post<Order>('/orders', data).then((r) => r.data),

  update: (id: number, data: Partial<Order>) =>
    apiClient.patch<Order>(`/orders/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/orders/${id}`).then((r) => r.data),

  incrementPrinted: (id: number) =>
    apiClient.post<{ printed_count: number; status: string }>(`/orders/${id}/increment`).then((r) => r.data),

  decrementPrinted: (id: number) =>
    apiClient.post<{ printed_count: number; status: string }>(`/orders/${id}/decrement`).then((r) => r.data),

  count: (status?: string) =>
    apiClient.get<{ count: number }>('/orders/count', { params: { status } }).then((r) => r.data),
};

// WebSocket
export async function createPrinterWebSocket(printerId: number): Promise<WebSocket> {
  const baseUrl = await getApiBaseUrl();
  const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return new WebSocket(`${wsUrl}/ws/printer/${printerId}`);
}

export default apiClient;
