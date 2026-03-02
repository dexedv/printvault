import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Badge, Group, Text, UnstyledButton } from '@mantine/core';
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
  IconUsers,
  IconShoppingCart,
  IconChevronDown,
  IconChevronRight,
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
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Navigation structure with categories
interface NavItem {
  to?: string;
  label: string;
  icon?: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  // Categories with dropdowns at the top
  {
    label: 'Dateien',
    icon: IconFiles,
    children: [
      { to: '/library', label: 'Bibliothek', icon: IconFiles },
      { to: '/projects', label: 'Projekte', icon: IconFolder },
    ],
  },
  {
    label: 'Drucken',
    icon: IconPrinter,
    children: [
      { to: '/printers', label: 'Drucker', icon: IconPrinter },
      { to: '/monitor', label: 'Live-Überwachung', icon: IconGauge },
      { to: '/jobs', label: 'Druckaufträge', icon: IconHistory },
      { to: '/profiles', label: 'Profile', icon: IconTool },
    ],
  },
  {
    label: 'Verwaltung',
    icon: IconShoppingCart,
    children: [
      { to: '/customers', label: 'Kunden', icon: IconUsers },
      { to: '/orders', label: 'Aufträge', icon: IconShoppingCart },
    ],
  },
  // Single items at the bottom
  { to: '/filaments', label: 'Filamente', icon: IconCube },
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
  const [appVersion, setAppVersion] = useState('1.0.7');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Dateien', 'Drucken', 'Verwaltung']) // All categories expanded by default
  );

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Get version from Tauri
  useEffect(() => {
    const getVersion = async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const version = await getVersion();
        setAppVersion(version);
      } catch {
        // Fallback - keep default
      }
    };
    getVersion();
  }, []);

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
            // Check if this item has children (is a category)
            if (item.children) {
              const isExpanded = expandedCategories.has(item.label);
              const isChildActive = item.children.some(
                child => location.pathname === child.to || location.pathname.startsWith(child.to || '')
              );

              return (
                <div key={item.label}>
                  <UnstyledButton
                    onClick={() => toggleCategory(item.label)}
                    style={{
                      ...navLinkStyle(isChildActive),
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    {item.icon && <item.icon size={20} />}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  </UnstyledButton>
                  {isExpanded && (
                    <div style={{ paddingLeft: '16px', marginTop: '4px', marginBottom: '4px' }}>
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.to;
                        return (
                          <Link
                            to={child.to || '#'}
                            key={child.to}
                            style={navLinkStyle(isActive)}
                          >
                            {child.icon && <child.icon size={18} />}
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav item
            const isActive = location.pathname === item.to ||
              (item.to !== '/library' && location.pathname.startsWith(item.to));

            return (
              <Link
                to={item.to}
                key={item.to}
                style={navLinkStyle(isActive)}
              >
                {item.icon && <item.icon size={20} />}
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
            v{appVersion}
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
            {(() => {
              // First check children in categories
              for (const item of navItems) {
                if (item.children) {
                  const found = item.children.find(child => location.pathname === child.to);
                  if (found) return found.label;
                }
              }
              // Then check top-level items
              return navItems.find(item => item.to && location.pathname.startsWith(item.to))?.label || 'Dashboard';
            })()}
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
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
