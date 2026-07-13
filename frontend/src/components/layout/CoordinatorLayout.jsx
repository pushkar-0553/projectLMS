import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BarChart3, Calendar, ClipboardList, GraduationCap, History, LayoutList, LogOut, Users, MessageSquare } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell';
import MessagingIcon from '../messaging/MessagingIcon';

const CoordinatorLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/coordinator', icon: Users, label: 'Students' },
    { path: '/coordinator/subbatches', icon: LayoutList, label: 'Sub-Batches' },
    { path: '/coordinator/tasks', icon: ClipboardList, label: 'Manage Tasks' },
    { path: '/coordinator/academics', icon: GraduationCap, label: 'Academics' },
    { path: '/coordinator/attendance', icon: Calendar, label: 'Attendance' },
    ...(user?.role === 'faculty' ? [
      { path: '/coordinator/guidance', icon: BookOpen, label: 'Guidance' },
      { path: '/coordinator/interviews', icon: Video, label: 'Mock Interviews' }
    ] : []),
    { path: '/coordinator/history', icon: History, label: 'My History' }
  ]

  return (
    <div className="coordinator-layout">
      <aside className="coordinator-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <GraduationCap size={28} />
            <span className="logo-text">{user?.role === 'faculty' ? 'Faculty Portal' : 'Coordinator Portal'}</span>
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
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'faculty' ? 'Senior Faculty' : 'LMS Coordinator'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="coordinator-container">
        <header className="coordinator-top-header">
          <div className="header-search">
            <input type="text" placeholder="Search students, batches..." className="header-search-input" />
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MessagingIcon />
            <NotificationBell />
          </div>
        </header>
        <main className="coordinator-main-content">{children}</main>
      </div>

      <style>{`
        .coordinator-layout { display: flex; min-height: 100vh; }
        .coordinator-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 260px;
          background: #111827;
          color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        .sidebar-header { padding: 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-size: 19px; font-weight: 800; }
        .sidebar-nav { flex: 1; padding: 18px 0; }
        .nav-list { list-style: none; margin: 0; padding: 0; }
        .nav-item { margin-bottom: 4px; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          color: rgba(255,255,255,0.76);
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 4px solid transparent;
        }
        .nav-link:hover { background: rgba(255,255,255,0.08); color: white; }
        .nav-link.active { background: rgba(79,70,229,0.28); color: white; border-left-color: #10b981; }
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
        .coordinator-main-content { flex: 1; background-color: #f8fafc; min-height: calc(100vh - 70px); }
        .coordinator-container { flex: 1; margin-left: 260px; display: flex; flex-direction: column; }
        .coordinator-top-header {
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
          .coordinator-sidebar { width: 78px; }
          .logo-text, .nav-label, .user-details { display: none; }
          .nav-link { justify-content: center; padding: 14px; }
          .user-info { justify-content: center; }
          .coordinator-container { margin-left: 78px; }
        }
      `}</style>
    </div>
  )
}

export default CoordinatorLayout
