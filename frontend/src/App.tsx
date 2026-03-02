import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Badge, Group, Text } from '@mantine/core';
import {
  IconFiles,
  IconFolder,
  IconTool,
  IconCube,
  IconPrinter,
  IconGauge,
  IconHistory,
  IconSettings,
  IconPlug,
} from '@tabler/icons-react';

import Library from './pages/Library';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Filaments from './pages/Filaments';
import Profiles from './pages/Profiles';
import Printers from './pages/Printers';
import LiveMonitor from './pages/LiveMonitor';
import Jobs from './pages/Jobs';
import Settings from './pages/Settings';
import Extensions from './pages/Extensions';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

const navItems = [
  { to: '/library', label: 'Bibliothek', icon: IconFiles },
  { to: '/projects', label: 'Projekte', icon: IconFolder },
  { to: '/profiles', label: 'Profile', icon: IconTool },
  { to: '/filaments', label: 'Filamente', icon: IconCube },
  { to: '/printers', label: 'Drucker', icon: IconPrinter },
  { to: '/monitor', label: 'Live-Überwachung', icon: IconGauge },
  { to: '/jobs', label: 'Aufträge', icon: IconHistory },
  { to: '/extensions', label: 'Erweiterungen', icon: IconPlug },
];

const sidebarStyle: React.CSSProperties = {
  width: '260px',
  background: 'white',
  borderRight: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: '#f8fafc',
};

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  textDecoration: 'none',
  color: isActive ? '#2563eb' : '#475569',
  background: isActive ? '#eff6ff' : 'transparent',
  fontWeight: isActive ? 500 : 400,
  marginBottom: '4px',
  transition: 'all 0.15s',
});

function App() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  // Check if we're in Tauri environment
  useEffect(() => {
    // Check for Tauri - either via window.__TAURI__ or via file protocol
    const isTauri = !!(window as any).__TAURI__ || window.location.protocol === 'file:';
    // In dev mode without Tauri, skip loading screen
    if (import.meta.env.DEV && !isTauri) {
      setLoading(false);
    }
    // In production (including Tauri builds), always show loading screen
  }, []);

  const handleLoadingComplete = () => {
    setLoading(false);
  };

  if (loading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <IconPrinter size={28} color="#2563eb" style={{ marginRight: 8 }} />
          <Text style={{ fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>
            PrintVault
          </Text>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/library' && location.pathname.startsWith(item.to));

            return (
              <Link
                to={item.to}
                key={item.to}
                style={navLinkStyle(isActive)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings & Version */}
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <Link
            to="/settings"
            style={navLinkStyle(location.pathname === '/settings')}
          >
            <IconSettings size={20} />
            <span>Einstellungen</span>
          </Link>
          <Badge variant="light" color="green" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
            v1.0.1
          </Badge>
        </div>
      </aside>

      {/* Main Content */}
      <main style={mainStyle}>
        <ErrorBoundary>
        {/* Header */}
        <header style={{
          height: '64px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}>
          <Text style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            {navItems.find(item => location.pathname.startsWith(item.to))?.label || 'Dashboard'}
          </Text>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="/library" element={<Library />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/filaments" element={<Filaments />} />
            <Route path="/printers" element={<Printers />} />
            <Route path="/monitor" element={<LiveMonitor />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
