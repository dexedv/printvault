// PrintVault Shared Types
// Shared TypeScript interfaces between frontend and backend

// Projects
export interface Project {
  id: number;
  name: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: number;
  project_id: number;
  version: number;
  file_path: string;
  file_hash: string;
  file_type: string;
  file_size: number;
  bounding_box?: BoundingBox;
  volume?: number;
  triangle_count?: number;
  thumbnail_path?: string;
  notes?: string;
  created_at: string;
}

// Files
export interface File {
  id: number;
  project_version_id?: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_hash: string;
  file_type: string;
  file_size: number;
  bounding_box?: BoundingBox;
  volume?: number;
  triangle_count?: number;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  dimensions: [number, number, number];
}

// Filaments
export interface Filament {
  id: number;
  material: string;
  color_name: string;
  color_hex: string;
  vendor?: string;
  total_weight_kg: number;
  remaining_weight_kg: number;
  spool_cost?: number;
  purchase_date?: string;
  location?: string;
  notes?: string;
  low_stock_threshold: number;
  created_at: string;
}

export interface FilamentCreate {
  material: string;
  color_name: string;
  color_hex?: string;
  vendor?: string;
  total_weight_kg: number;
  remaining_weight_kg?: number;
  spool_cost?: number;
  purchase_date?: string;
  location?: string;
  notes?: string;
  low_stock_threshold?: number;
}

// Print Profiles
export interface PrintProfile {
  id: number;
  name: string;
  nozzle_temp: number;
  bed_temp: number;
  layer_height: number;
  print_speed: number;
  infill: number;
  material: string;
  notes?: string;
  is_default: boolean;
  created_at: string;
}

// Printers
export interface Printer {
  id: number;
  name: string;
  printer_type: 'klipper' | 'bambulab' | 'octoprint';
  host: string;
  port: number;
  api_key?: string;
  is_active: boolean;
  last_connected?: string;
  created_at: string;
}

export interface PrinterCreate {
  name: string;
  printer_type?: string;
  host: string;
  port?: number;
  api_key?: string;
}

// Print Jobs
export interface PrintJob {
  id: number;
  printer_id: number;
  project_version_id?: number;
  profile_id?: number;
  filament_id?: number;
  filename: string;
  status: 'pending' | 'printing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  finished_at?: string;
  duration_seconds?: number;
  layers_completed?: number;
  total_layers?: number;
  progress_percent: number;
  temperature_nozzle?: number;
  temperature_bed?: number;
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface JobSnapshot {
  id: number;
  job_id: number;
  timestamp: string;
  progress_percent: number;
  layer_current?: number;
  layer_total?: number;
  nozzle_temp?: number;
  bed_temp?: number;
  z_position?: number;
  extrusion_mm?: number;
  speed_percent?: number;
  metadata: Record<string, any>;
}

// Printer Status (from Klipper)
export interface PrinterStatus {
  printer: {
    state: string;
    filename: string;
    total_duration: number;
    print_duration: number;
  };
  temperatures: {
    heater_bed: { actual: number; target: number };
    extruder: { actual: number; target: number };
  };
  progress: number;
  layer: {
    current: number;
    total: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// WebSocket Messages
export interface WsMessage {
  type: 'status_update' | 'job_update' | 'error' | 'ping' | 'pong';
  timestamp: string;
  data?: any;
}
