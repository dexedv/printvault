# PrintVault - Specification Document

## 1. Project Overview

**Project Name:** PrintVault
**Project Type:** Desktop Application (Electron)
**Core Feature Summary:** A comprehensive 3D print management application for organizing STL/3MF/GCODE/STEP files, managing filaments, monitoring Klipper printers, and handling print jobs.
**Target Users:** 3D printing enthusiasts, makers, and small print shops who need to organize their print files and monitor multiple printers.

---

## 2. UI/UX Specification

### 2.1 Layout Structure

**Window Model:**
- Main window (1200x800 minimum, resizable)
- Native window frame with standard controls (close, minimize, maximize)
- Single-window application with sidebar navigation

**Major Layout Areas:**
```
┌─────────────────────────────────────────────────────────┐
│  Title Bar (native)                              [─][□][×]│
├────────────┬────────────────────────────────────────────┤
│            │  Header: Page Title + Actions              │
│  Sidebar   ├────────────────────────────────────────────┤
│  Navigation│                                            │
│            │  Main Content Area                         │
│  - Library │                                            │
│  - Projects│                                            │
│  - Filament│                                            │
│  - Printers│                                            │
│  - Monitor │                                            │
│  - Jobs    │                                            │
│  - Settings│                                            │
│            │                                            │
├────────────┴────────────────────────────────────────────┤
│  Status Bar: Connection status, last sync, version     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Visual Design

**Color Palette:**
- Primary: `#2563EB` (Blue 600)
- Primary Dark: `#1D4ED8` (Blue 700)
- Secondary: `#64748B` (Slate 500)
- Accent: `#F59E0B` (Amber 500)
- Success: `#10B981` (Emerald 500)
- Error: `#EF4444` (Red 500)
- Warning: `#F59E0B` (Amber 500)
- Background: `#F8FAFC` (Slate 50)
- Surface: `#FFFFFF` (White)
- Text Primary: `#1E293B` (Slate 800)
- Text Secondary: `#64748B` (Slate 500)
- Border: `#E2E8F0` (Slate 200)

**Dark Mode:**
- Background: `#0F172A` (Slate 900)
- Surface: `#1E293B` (Slate 800)
- Text Primary: `#F1F5F9` (Slate 100)
- Text Secondary: `#94A3B8` (Slate 400)

**Typography:**
- Font Family: Inter, system-ui, sans-serif
- Headings:
  - H1: 24px, 700 weight
  - H2: 20px, 600 weight
  - H3: 16px, 600 weight
- Body: 14px, 400 weight
- Small: 12px, 400 weight

**Spacing System:**
- Base unit: 4px
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px

**Visual Effects:**
- Card shadows: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Hover shadows: `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)`
- Border radius: 8px (cards), 6px (buttons), 4px (inputs)
- Transitions: 150ms ease-in-out

### 2.3 Components

**Sidebar:**
- Width: 240px (collapsible to 64px)
- Navigation items with icons
- Active state: Blue background with white text
- Hover state: Light blue background

**Cards:**
- File cards: Thumbnail + filename + metadata
- Project cards: Name + description + version count + tags
- Filament cards: Color swatch + material + weight + remaining %

**Buttons:**
- Primary: Blue background, white text
- Secondary: White background, gray border
- Danger: Red background, white text
- States: hover (darken 10%), active (darken 20%), disabled (50% opacity)

**Forms:**
- Input fields with labels above
- Validation messages below inputs
- Required field indicators (*)

**3D Viewer:**
- Full STL/3MF preview with orbit controls
- Grid floor, ambient + directional lighting
- Bounding box display
- Zoom/pan/rotate controls

---

## 3. Functional Specification

### 3.1 Core Features

**A. File Library (MVP)**
- Import STL, 3MF, GCODE, STEP files
- Store files in AppData/PrintVault/storage/
- Calculate file hash (SHA256) for deduplication
- Extract metadata: bounding box, volume, triangle count
- Generate thumbnails using three.js
- Search by filename, tags
- Filter by file type, date, project

**B. Projects & Versions (MVP)**
- Create projects with name, description
- Upload file versions to projects
- Tag management (create, assign, remove tags)
- Version history with timestamps

**C. Filament Management (MVP)**
- Track spool inventory
- Fields: material (PLA, PETG, ABS, TPU, etc.), color, color hex, weight (kg), remaining weight, purchase date, vendor
- Low stock warnings (configurable threshold)
- Spool location tracking

**D. Print Profiles**
- Store print parameters: temperature (nozzle/bed), speeds, layer height, infill, supports, notes
- Profile snapshots saved per print job
- Default profiles per material type

**E. Printer Management**
- Add printers with name, type, connection details
- Klipper/Moonraker configuration (host, API key)
- Printer status: idle, printing, paused, error

**F. Live Monitoring (MVP)**
- WebSocket connection to Moonraker
- Real-time data: temperatures, print progress, current layer, file info
- Print job history with statistics

**G. Adapter Architecture**
- Interface: `PrinterAdapter` (connect, disconnect, subscribe, getStatus)
- KlipperAdapter implementation
- Future: BambuAdapter, OctoPrintAdapter

### 3.2 Data Flow & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  IPC Handler│  │ File Watcher│  │ Window Manager      │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                       │
│  ┌──────┴──────────────────────────────────────────────────┐ │
│  │            Electron Renderer (React)                     │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │ │
│  │  │ Pages   │ │Components│ │  Store  │ │ API Client  │ │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └──────┬──────┘ │ │
│  └──────────────────────────────────────────────┬────────┘ │
└─────────────────────────────────────────────────┼───────────┘
                                                  │ HTTP/WS
┌─────────────────────────────────────────────────┼───────────┐
│                  FastAPI Backend                │           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┴────────┐ │
│  │ REST Endpts │  │ WS Handler   │  │ Printer Adapters │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                    │          │
│  ┌──────┴─────────────────┴────────────────────┴────────┐ │
│  │                  Service Layer                         │ │
│  │  FileService | ProjectService | FilamentService | ...  │ │
│  └──────────────────────────┬────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐ │
│  │              SQLModel (SQLAlchemy) + SQLite             │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Key Modules:**

1. **Backend (Python/FastAPI)**
   - `main.py` - FastAPI app, CORS, lifespan events
   - `api/routes/` - REST endpoints
   - `api/websocket.py` - WebSocket endpoints
   - `services/` - Business logic
   - `adapters/` - Printer adapters (Klipper)
   - `db/` - Database models and session
   - `utils/` - File processing, hashing

2. **Frontend (React/TypeScript)**
   - `main.tsx` - Electron entry
   - `App.tsx` - Main app with routing
   - `pages/` - Page components
   - `components/` - Reusable UI components
   - `store/` - State management (Zustand)
   - `api/` - API client + WebSocket
   - `three/` - 3D viewer components

3. **Shared**
   - `types/` - TypeScript interfaces
   - `constants/` - Shared constants

### 3.3 Database Schema

```
projects
├── id (PK)
├── name
├── description
├── created_at
├── updated_at
└── tags (JSON)

project_versions
├── id (PK)
├── project_id (FK)
├── version
├── file_path
├── file_hash
├── file_type
├── file_size
├── bounding_box (JSON)
├── volume
├── triangle_count
├── thumbnail_path
├── created_at
└── notes

files
├── id (PK)
├── project_version_id (FK, nullable)
├── filename
├── original_name
├── file_path
├── file_hash
├── file_type
├── file_size
├── bounding_box (JSON)
├── volume
├── triangle_count
├── thumbnail_path
├── created_at
└── metadata (JSON)

print_profiles
├── id (PK)
├── name
├── nozzle_temp
├── bed_temp
├── layer_height
├── print_speed
├── infill
├── material
├── notes
├── is_default
└── created_at

filaments
├── id (PK)
├── material
├── color_name
├── color_hex
├── vendor
├── total_weight_kg
├── remaining_weight_kg
├── spool_cost
├── purchase_date
├── location
├── notes
├── low_stock_threshold
└── created_at

printers
├── id (PK)
├── name
├── type (klipper, bambulab, octoprint)
├── host
├── port
├── api_key (encrypted)
├── is_active
├── last_connected
└── created_at

print_jobs
├── id (PK)
├── printer_id (FK)
├── project_version_id (FK, nullable)
├── profile_id (FK, nullable)
├── filament_id (FK, nullable)
├── filename
├── status (pending, printing, paused, completed, failed, cancelled)
├── started_at
├── finished_at
├── duration_seconds
├── layers_completed
├── total_layers
├── progress_percent
├── temperature_nozzle
├── temperature_bed
├── notes
└── metadata (JSON)

job_snapshots
├── id (PK)
├── job_id (FK)
├── timestamp
├── progress_percent
├── layer_current
├── layer_total
├── nozzle_temp
├── bed_temp
├── z_position
├── extrusion_mm
├── speed_percent
└── metadata (JSON)
```

### 3.4 Edge Cases

- Large file handling (>100MB): stream upload, show progress
- Duplicate files: hash check, prompt user
- Network disconnection during print: cache last state, reconnect
- Invalid file format: validate before import, show error
- Missing thumbnails: generate on-demand, show placeholder
- Database migration: handle schema changes gracefully

---

## 4. Acceptance Criteria

### 4.1 MVP Features

1. **File Library**
   - [ ] Can import STL files and display 3D preview
   - [ ] Thumbnails generated and displayed in grid
   - [ ] Search by filename works
   - [ ] Files stored in AppData/PrintVault/storage/

2. **Projects**
   - [ ] Can create/edit/delete projects
   - [ ] Can upload versions to projects
   - [ ] Version history displayed

3. **Filament**
   - [ ] Can add/edit/delete filaments
   - [ ] Remaining weight displayed with percentage
   - [ ] Low stock warning shown

4. **Printers & Monitoring**
   - [ ] Can add Klipper printer (host, API key)
   - [ ] WebSocket connects and shows live data
   - [ ] Temperatures update in real-time
   - [ ] Print progress shown

### 4.2 Visual Checkpoints

1. App launches with sidebar navigation visible
2. Library page shows file grid with thumbnails
3. 3D viewer renders STL files correctly
4. Filament cards show color swatches
5. Live monitor shows temperature graphs
6. Settings page allows API key management

---

## 5. Technical Stack

- **Frontend:** Electron 28+, React 18+, Vite 5+, TypeScript 5+
- **UI Library:** Mantine 7+
- **3D Viewer:** three.js, @react-three/fiber, @react-three/drei
- **State:** Zustand
- **Backend:** FastAPI, SQLModel, SQLite
- **3D Processing:** Trimesh (Python), Pillow
- **File Hashing:** hashlib (Python)
- **Packaging:** electron-builder
- **Security:** keytar (for API key storage)
