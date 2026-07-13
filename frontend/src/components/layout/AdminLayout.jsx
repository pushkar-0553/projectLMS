import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BarChart3, BookOpen, GraduationCap, History, Layers, LogOut, UserCog, Users, UserCheck, MessageSquare } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell';
import MessagingIcon from '../messaging/MessagingIcon';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/admin', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/projects', icon: BookOpen, label: 'Projects' },
    { path: '/admin/students', icon: Users, label: 'Students' },
    { path: '/admin/coordinators', icon: GraduationCap, label: 'Coordinators' },
    { path: '/admin/faculties', icon: UserCheck, label: 'Faculty' },
    { path: '/admin/batches', icon: Layers, label: 'Batches' },
    { path: '/admin/users', icon: UserCog, label: 'Users' },
    { path: '/admin/history', icon: History, label: 'System History' }
  ]

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <GraduationCap size={28} />
            <span className="logo-text">Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link to={item.path} className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}>
                  <item.icon size={20} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="admin-container">
        <header className="admin-top-header">
          <div className="header-search">
            <input type="text" placeholder="Global system search..." className="header-search-input" />
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MessagingIcon />
            <NotificationBell />
          </div>
        </header>
        <main className="admin-main-content">{children}</main>
      </div>

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; }
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 260px;
          background: #1f2937;
          color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        .sidebar-header { padding: 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-size: 20px; font-weight: 800; }
        .sidebar-nav { flex: 1; padding: 18px 0; }
        .nav-list { list-style: none; margin: 0; padding: 0; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          color: rgba(255,255,255,0.78);
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 4px solid transparent;
        }
        .nav-link:hover { background: rgba(255,255,255,0.08); color: white; }
        .nav-link.active { background: rgba(16,185,129,0.18); color: white; border-left-color: #10b981; }
        .nav-label { font-size: 14px; font-weight: 700; }
        .sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
        .user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
        .user-avatar { width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.14); display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .user-name { font-weight: 700; font-size: 14px; }
        .user-role { font-size: 12px; opacity: 0.75; }
        .logout-btn {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.16); }
        .admin-main-content { flex: 1; background-color: #f8fafc; min-height: calc(100vh - 70px); }
        .admin-container { flex: 1; margin-left: 260px; display: flex; flex-direction: column; }
        .admin-top-header {
          height: 70px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header-search-input {
          background: #f3f4f6;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          width: 320px;
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .admin-sidebar { width: 78px; }
          .logo-text, .nav-label, .user-details { display: none; }
          .nav-link { justify-content: center; padding: 14px; }
          .user-info { justify-content: center; }
          .admin-container { margin-left: 78px; }
        }
      `}</style>
    </div>
  )
}

export default AdminLayout
