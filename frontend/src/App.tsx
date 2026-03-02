import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Badge, Group, Text, UnstyledButton, Box, ThemeIcon, Tooltip } from '@mantine/core';
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
  IconStack2,
  IconTemperature,
  IconList,
  IconBell,
  IconColorSwatch,
  IconFileDots,
  IconBriefcase,
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
  {
    label: 'Dateien',
    icon: IconStack2,
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
      { to: '/monitor', label: 'Live-Monitor', icon: IconGauge },
      { to: '/jobs', label: 'Aufträge', icon: IconBriefcase },
      { to: '/profiles', label: 'Profile', icon: IconTool },
    ],
  },
  {
    label: 'Verwaltung',
    icon: IconShoppingCart,
    children: [
      { to: '/customers', label: 'Kunden', icon: IconUsers },
      { to: '/orders', label: 'Bestellungen', icon: IconShoppingCart },
    ],
  },
  { to: '/filaments', label: 'Filamente', icon: IconColorSwatch },
  { to: '/extensions', label: 'Erweiterungen', icon: IconPlug },
];

const sidebarStyle: React.CSSProperties = {
  width: 260,
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  borderRight: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
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
  gap: 12,
  padding: '10px 14px',
  borderRadius: 10,
  textDecoration: 'none',
  color: isActive ? '#2563eb' : '#64748b',
  background: isActive ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'transparent',
  fontWeight: isActive ? 600 : 500,
  marginBottom: 4,
  transition: 'all 0.2s ease',
  fontSize: 14,
});

function App() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [appVersion, setAppVersion] = useState('1.0.8');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
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

  useEffect(() => {
    const isTauri = !!(window as any).__TAURI__ || window.location.protocol === 'file:';
    if (import.meta.env.DEV && !isTauri) {
      setLoading(false);
    }
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
        <Box
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          }}
        >
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <IconPrinter size={22} color="white" />
          </Box>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            PrintVault
          </Text>
        </Box>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflow: 'auto' }}>
          {navItems.map((item) => {
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
                      marginBottom: 8,
                    }}
                  >
                    {item.icon && <item.icon size={20} />}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isExpanded ? (
                      <IconChevronDown size={16} style={{ opacity: 0.6 }} />
                    ) : (
                      <IconChevronRight size={16} style={{ opacity: 0.6 }} />
                    )}
                  </UnstyledButton>
                  {isExpanded && (
                    <div style={{ paddingLeft: 12, marginTop: 4, marginBottom: 8 }}>
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.to;
                        return (
                          <Link
                            to={child.to || '#'}
                            key={child.to}
                            style={{
                              ...navLinkStyle(isActive),
                              paddingLeft: 16,
                              fontSize: 13,
                            }}
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
        <Box style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <Link
            to="/settings"
            style={navLinkStyle(location.pathname === '/settings')}
          >
            <IconSettings size={20} />
            <span>Einstellungen</span>
          </Link>
          <Box
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <Badge
              variant="light"
              color="blue"
              style={{
                width: '100%',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              v{appVersion}
            </Badge>
          </Box>
        </Box>
      </aside>

      {/* Main Content */}
      <main style={mainStyle}>
        <ErrorBoundary>
          {/* Header */}
          <header
            style={{
              height: 64,
              background: 'white',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              {(() => {
                for (const item of navItems) {
                  if (item.children) {
                    const found = item.children.find(child => location.pathname === child.to);
                    if (found) return found.label;
                  }
                }
                return navItems.find(item => item.to && location.pathname.startsWith(item.to))?.label || 'Dashboard';
              })()}
            </Text>
            <Group gap="sm">
              <Tooltip label="Benachrichtigungen">
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <IconBell size={20} color="#64748b" />
                </Box>
              </Tooltip>
            </Group>
          </header>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
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
