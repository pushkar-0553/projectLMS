import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Calendar, Video, Award, Settings, LogOut, Bell, 
  BookOpen, UserCheck, BarChart3, GraduationCap, Clock, ChevronRight,
  Target, MessageSquare, FileText
} from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import MessagingIcon from '../messaging/MessagingIcon';

const FacultyLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/faculty', label: 'Overview', icon: BarChart3 },
    { path: '/faculty/student-monitoring', label: 'Student Monitoring', icon: Users },
    { path: '/resumes', label: 'Resume Hub', icon: FileText },
    { path: '/faculty/projects', label: 'Projects Management', icon: Target },
    { path: '/faculty/guidance', label: 'Academic Guidance', icon: BookOpen },
    { path: '/faculty/interviews', label: 'Mock Interviews', icon: Video },
    { path: '/faculty/sessions', label: 'Live Classes', icon: Calendar },
    { path: '/faculty/performance', label: 'Performance', icon: Award },
    { path: '/faculty/history', label: 'Activity History', icon: Clock },
  ];

  return (
    <div className="faculty-layout">
      {/* Sidebar Overlay for Mobile */}
      <div className="sidebar-mobile-overlay"></div>

      <aside className="faculty-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <GraduationCap className="logo-icon" size={28} />
          </div>
          <div className="brand-text">
            <h2>Mentor Hub</h2>
            <span className="platform-tag">v2.4 Premium</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="profile-img-wrapper">
            <div className="profile-img">
              {user?.name?.charAt(0) || 'F'}
              <div className="status-indicator online"></div>
            </div>
          </div>
          <div className="profile-info">
            <span className="profile-name">{user?.name || 'Faculty Member'}</span>
            <span className="profile-role">Senior Mentor</span>
          </div>
        </div>

        <nav className="faculty-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <div className="icon-wrapper">
                    <item.icon size={20} />
                  </div>
                  <span className="link-text">{item.label}</span>
                  {location.pathname === item.path && <ChevronRight size={14} className="active-arrow" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <div className="icon-wrapper">
              <LogOut size={18} />
            </div>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="faculty-main">
        <header className="faculty-header">
          <div className="header-left">
            <div className="breadcrumb">
              <span>Platform</span>
              <ChevronRight size={14} />
              <span className="current-page">
                {menuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>
          <div className="header-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MessagingIcon />
            <NotificationBell />
            <div className="v-divider"></div>
            <div className="time-display">
              <Clock size={16} />
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        <section className="faculty-content-viewport">
          <Outlet />
        </section>
      </main>

      <style>{`
        .faculty-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* --- Sidebar --- */
        .faculty-sidebar {
          width: 280px;
          height: 100vh;
          background: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 4px 0 25px rgba(0,0,0,0.1);
        }

        .sidebar-brand {
          padding: 2.5rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-logo {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .brand-text h2 {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .platform-tag {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 600;
        }

        .sidebar-profile {
          margin: 0 1rem 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .profile-img {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
          position: relative;
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #0f172a;
        }

        .status-indicator.online { background: #22c55e; }

        .profile-info { display: flex; flex-direction: column; }
        .profile-name { font-size: 0.875rem; font-weight: 600; }
        .profile-role { font-size: 0.75rem; color: #94a3b8; }

        .faculty-nav { flex: 1; padding: 0 1rem; }
        .nav-list { list-style: none; padding: 0; margin: 0; }
        .nav-item { margin-bottom: 0.5rem; }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          color: #94a3b8;
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-link.active {
          background: rgba(79, 70, 229, 0.1);
          color: #818cf8;
          position: relative;
          box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2);
        }

        .active-arrow { margin-left: auto; opacity: 0.6; }

        .sidebar-footer { padding: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05); }

        .logout-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .logout-button:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        /* --- Main Content --- */
        .faculty-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .faculty-header {
          height: 72px;
          background: white;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          z-index: 40;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .current-page { font-weight: 600; color: #0f172a; }

        .header-right { display: flex; align-items: center; gap: 1.25rem; }

        .header-icon-btn {
          position: relative;
          background: #f1f5f9;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .header-icon-btn:hover { background: #e2e8f0; color: #0f172a; }

        .btn-badge {
          position: absolute;
          top: 8px; right: 8px;
          width: 8px; height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
        }

        .v-divider { width: 1px; height: 24px; background: #e2e8f0; }

        .time-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .faculty-content-viewport {
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
          padding-bottom: 3rem;
        }

        .faculty-content-viewport::-webkit-scrollbar { width: 6px; }
        .faculty-content-viewport::-webkit-scrollbar-track { background: transparent; }
        .faculty-content-viewport::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FacultyLayout;
