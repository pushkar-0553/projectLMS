import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BarChart3, BookOpen, Calendar, ClipboardList, GraduationCap, KeyRound, LogOut, TrendingUp, MessageSquare } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell';
import MessagingIcon from '../messaging/MessagingIcon';

const StudentLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/project-learning', icon: BookOpen, label: 'Project Learning' },
    { path: '/student/tasks', icon: ClipboardList, label: 'Learning Tasks' },
    { path: '/my-progress', icon: TrendingUp, label: 'Project Progress' },
    { path: '/academic-progress', icon: GraduationCap, label: 'Academic Progress' },
    { path: '/student/attendance', icon: Calendar, label: 'My Attendance' },
    { path: '/change-password', icon: KeyRound, label: 'Change Password' }
  ]

  return (
    <div className="student-layout">
      <aside className="student-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <BookOpen size={28} />
            <span className="logo-text">Student Portal</span>
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
              <div className="user-role">Student</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="student-container">
        <header className="student-top-header">
          <div className="header-greeting">
            Welcome back, <strong>{user?.name}</strong>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MessagingIcon />
            <NotificationBell />
          </div>
        </header>
        <main className="student-main-content">{children}</main>
      </div>

      <style>{`
        .student-layout { display: flex; min-height: 100vh; }
        .student-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 260px;
          background: #0f766e;
          color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        .sidebar-header { padding: 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.12); }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-size: 19px; font-weight: 800; }
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
        .nav-link.active { background: rgba(255,255,255,0.16); color: white; border-left-color: #f59e0b; }
        .nav-label { font-size: 14px; font-weight: 700; }
        .sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.12); }
        .user-info { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
        .user-avatar { width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.16); display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .user-name { font-weight: 700; font-size: 14px; }
        .user-role { font-size: 12px; opacity: 0.78; }
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
        .student-main-content { flex: 1; background-color: #f8fafc; min-height: calc(100vh - 70px); }
        .student-container { flex: 1; margin-left: 260px; display: flex; flex-direction: column; }
        .student-top-header {
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
        .header-greeting { font-size: 14px; color: #4b5563; }
        @media (max-width: 768px) {
          .student-sidebar { width: 78px; }
          .logo-text, .nav-label, .user-details { display: none; }
          .nav-link { justify-content: center; padding: 14px; }
          .user-info { justify-content: center; }
          .student-container { margin-left: 78px; }
        }
      `}</style>
    </div>
  )
}

export default StudentLayout
