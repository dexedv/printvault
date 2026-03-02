import { create } from 'zustand';
import type { File, Project, Filament, Printer, PrintJob, PrinterStatus } from '@shared/types';

// Files Store
interface FilesState {
  files: File[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setFiles: (files: File[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  addFile: (file: File) => void;
  removeFile: (id: number) => void;
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  loading: false,
  error: null,
  searchQuery: '',
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  addFile: (file) => set((state) => ({ files: [file, ...state.files] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
}));

// Projects Store
interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: number, data: Partial<Project>) => void;
  removeProject: (id: number) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
  updateProject: (id, data) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
      currentProject:
        state.currentProject?.id === id ? { ...state.currentProject, ...data } : state.currentProject,
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),
}));

// Filaments Store
interface FilamentsState {
  filaments: Filament[];
  loading: boolean;
  error: string | null;
  setFilaments: (filaments: Filament[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addFilament: (filament: Filament) => void;
  updateFilament: (id: number, data: Partial<Filament>) => void;
  removeFilament: (id: number) => void;
}

export const useFilamentsStore = create<FilamentsState>((set) => ({
  filaments: [],
  loading: false,
  error: null,
  setFilaments: (filaments) => set({ filaments }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addFilament: (filament) => set((state) => ({ filaments: [filament, ...state.filaments] })),
  updateFilament: (id, data) =>
    set((state) => ({
      filaments: state.filaments.map((f) => (f.id === id ? { ...f, ...data } : f)),
    })),
  removeFilament: (id) =>
    set((state) => ({ filaments: state.filaments.filter((f) => f.id !== id) })),
}));

// Printers Store
interface PrintersState {
  printers: Printer[];
  currentPrinter: Printer | null;
  printerStatus: Record<number, PrinterStatus>;
  loading: boolean;
  error: string | null;
  setPrinters: (printers: Printer[]) => void;
  setCurrentPrinter: (printer: Printer | null) => void;
  setPrinterStatus: (printerId: number, status: PrinterStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPrinter: (printer: Printer) => void;
  updatePrinter: (id: number, data: Partial<Printer>) => void;
  removePrinter: (id: number) => void;
}

export const usePrintersStore = create<PrintersState>((set) => ({
  printers: [],
  currentPrinter: null,
  printerStatus: {},
  loading: false,
  error: null,
  setPrinters: (printers) => set({ printers }),
  setCurrentPrinter: (currentPrinter) => set({ currentPrinter }),
  setPrinterStatus: (printerId, status) =>
    set((state) => ({
      printerStatus: { ...state.printerStatus, [printerId]: status },
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addPrinter: (printer) => set((state) => ({ printers: [...state.printers, printer] })),
  updatePrinter: (id, data) =>
    set((state) => ({
      printers: state.printers.map((p) => (p.id === id ? { ...p, ...data } : p)),
      currentPrinter: state.currentPrinter?.id === id ? { ...state.currentPrinter, ...data } : state.currentPrinter,
    })),
  removePrinter: (id) =>
    set((state) => ({
      printers: state.printers.filter((p) => p.id !== id),
      currentPrinter: state.currentPrinter?.id === id ? null : state.currentPrinter,
    })),
}));

// Jobs Store
interface JobsState {
  jobs: PrintJob[];
  loading: boolean;
  error: string | null;
  setJobs: (jobs: PrintJob[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addJob: (job: PrintJob) => void;
  updateJob: (id: number, data: Partial<PrintJob>) => void;
  removeJob: (id: number) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  setJobs: (jobs) => set({ jobs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (id, data) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)),
    })),
  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
}));
