import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, 
  Layers, 
  Users, 
  Activity, 
  LogOut, 
  ChevronRight,
  Sparkles,
  Server,
  FileText
} from 'lucide-react';

const SuperAdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Platform Overview', path: '/super-admin/overview', icon: Activity },
    { label: 'Courses Management', path: '/super-admin/courses', icon: Layers },
    { label: 'Global Users', path: '/super-admin/users', icon: Users },
    { label: 'Cloud & DB Telemetry', path: '/super-admin/telemetry', icon: Server },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b'
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>SUPER ADMIN</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Platform Console</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', padding: '0 12px 10px', letterSpacing: '0.05em' }}>
            PLATFORM
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? '#fff' : '#94a3b8',
                  background: isActive ? '#1e293b' : 'transparent',
                  marginBottom: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#38bdf8' : '#64748b' }} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div style={{ marginTop: '28px', fontSize: '11px', fontWeight: 600, color: '#64748b', padding: '0 12px 10px', letterSpacing: '0.05em' }}>
            QUICK ACCESS
          </div>
          <Link
            to="/resumes"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              color: '#94a3b8',
              background: 'transparent',
              marginBottom: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} style={{ color: '#06b6d4' }} />
              <span>Resume Placement Hub</span>
            </div>
            <ChevronRight size={14} style={{ color: '#475569' }} />
          </Link>
          <Link
            to="/legacy/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              color: '#94a3b8',
              background: 'transparent',
              marginBottom: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} style={{ color: '#4f46e5' }} />
              <span>Legacy Full Stack</span>
            </div>
            <ChevronRight size={14} style={{ color: '#475569' }} />
          </Link>
          <Link
            to="/agentk/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              color: '#94a3b8',
              background: 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={16} style={{ color: '#06b6d4' }} />
              <span>AgentK GenAI</span>
            </div>
            <ChevronRight size={14} style={{ color: '#475569' }} />
          </Link>
        </nav>

        {/* Footer profile & logout */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', background: '#0b1120' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Super Admin'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            height: '64px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Platform</span>
            <span style={{ fontSize: '13px', color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {location.pathname.replace('/super-admin/', '').toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              SUPER ADMIN PRIVILEGES
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
