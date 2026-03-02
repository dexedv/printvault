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

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
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

// WebSocket
export function createPrinterWebSocket(printerId: number): WebSocket {
  return new WebSocket(`ws://localhost:8000/ws/printer/${printerId}`);
}

export default apiClient;
