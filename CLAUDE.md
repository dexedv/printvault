# PrintVault Development Guide

## Custom Slash Commands

This project has custom slash commands configured:

### /review
Analysiert den Code auf Sicherheitslücken und Schwachstellen. Überprüft den Code auf potenzielle Risiken wie unsichere Datenverarbeitung, unzureichende Authentifizierung und andere Sicherheitsprobleme.

### /push
Comittet und pusht alles auf Git und erstellt dann ein neues Release mit automatischer Versionierung (1.1.2, 1.2.0, etc.).

## Verfügbare Scripts

### Backend starten
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### Frontend starten
```bash
cd frontend
npm run dev
```

### Tauri App bauen
```bash
npm run tauri build
```
