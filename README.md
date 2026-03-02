# PrintVault

A comprehensive 3D print management desktop application built with Electron, React, FastAPI, and SQLite.

## Features

- **File Library**: Import and manage STL, 3MF, GCODE, STEP files
- **3D Preview**: View 3D models in the browser with three.js
- **Projects**: Organize files into projects with versions
- **Filament Management**: Track filament inventory with low-stock warnings
- **Print Profiles**: Save and manage print parameters
- **Printer Management**: Add Klipper/Moonraker printers
- **Live Monitoring**: Real-time print status via WebSocket

## Tech Stack

- **Frontend**: Electron 28, React 18, Vite 5, TypeScript, Mantine UI
- **3D Viewer**: Three.js, @react-three/fiber
- **Backend**: FastAPI, SQLModel, SQLite
- **Printer Integration**: Klipper/Moonraker via WebSocket

## Project Structure

```
printvault/
├── backend/               # FastAPI backend
│   ├── api/              # REST endpoints & WebSocket
│   ├── adapters/         # Printer adapters (Klipper)
│   ├── db/               # Database models & session
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── frontend/             # Electron + React frontend
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── store/        # Zustand state management
│   │   └── api/          # API client
│   └── electron/         # Electron main/preload
├── shared/               # Shared types
└── SPEC.md               # Specification document
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- pip

### Setup

1. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Running the Application

**Option 1: Run both separately**

Terminal 1 (Backend):
```bash
cd backend
python main.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Option 2: Run with Electron**

```bash
cd frontend
npm run electron:dev
```

### Building for Production

```bash
cd frontend
npm run build
npm run electron:build
```

## Configuration

### Backend Environment

Edit `backend/.env`:

```env
DATABASE_URL=sqlite:///./printvault.db
SECRET_KEY=your-secret-key
DEBUG=true
```

### Adding a Klipper Printer

1. Go to **Printers** page
2. Click **Add Printer**
3. Enter:
   - Name (e.g., "Ender 3 V2")
   - Host IP (e.g., `192.168.1.100`)
   - Port (default: `7125`)
   - API Key (optional, for Moonraker authentication)
4. Click **Test Connection** to verify

## Architecture

### Adapter Pattern

The printer integration uses an adapter pattern for future extensibility:

```
PrinterAdapter (interface)
├── KlipperAdapter (implemented)
├── (Future) BambuAdapter
└── (Future) OctoPrintAdapter
```

### API Communication

- REST API for CRUD operations
- WebSocket for real-time printer monitoring
- Electron IPC for native functionality

## License

MIT
