import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCourse } from '../../context/CourseContext'
import { BarChart3, BookOpen, GraduationCap, History, Layers, LogOut, UserCog, Users, UserCheck, MessageSquare, FileText, Shield, CheckSquare, Video, Menu, X } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell';
import MessagingIcon from '../messaging/MessagingIcon';
import CourseSwitcher from '../common/CourseSwitcher';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const { courseSlug } = useCourse()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const baseAdmin = courseSlug ? `/${courseSlug}/admin` : '/admin';

  const navItems = [
    { path: baseAdmin, icon: BarChart3, label: 'Dashboard' },
    { path: `${baseAdmin}/projects`, icon: BookOpen, label: 'Projects' },
    { path: `${baseAdmin}/students`, icon: Users, label: 'Students' },
    { path: `${baseAdmin}/coordinators`, icon: GraduationCap, label: 'Coordinators' },
    { path: `${baseAdmin}/faculties`, icon: UserCheck, label: 'Faculty' },
    { path: `${baseAdmin}/batches`, icon: Layers, label: 'Batches' },
    { path: `${baseAdmin}/exams`, icon: CheckSquare, label: 'Written Exams' },
    { path: courseSlug ? `/${courseSlug}/resumes` : '/resumes', icon: FileText, label: 'Resume Hub' },
    { path: courseSlug ? `/${courseSlug}/mock-interviews` : '/mock-interviews', icon: Video, label: 'Mock Interviews' },
    { path: courseSlug ? `/${courseSlug}/feedback` : '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: `${baseAdmin}/users`, icon: UserCog, label: 'Users' },
    { path: `${baseAdmin}/history`, icon: History, label: 'System History' },
    ...(user?.role === 'super_admin' ? [
      { path: '/super-admin/overview', icon: Shield, label: 'Platform Console', isSpecial: true }
    ] : [])
  ]

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <GraduationCap size={28} />
            <span className="logo-text">Admin Panel</span>
          </div>
          <button
            className="admin-sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link 
                  to={item.path} 
                  className={`nav-link ${(location.pathname === item.path || (item.path.includes('mock-interviews') && location.pathname.includes('mock-interviews')) || (item.path.includes('feedback') && location.pathname.includes('feedback'))) ? 'active' : ''}`}
                  style={item.isSpecial ? { color: '#38bdf8', borderLeftColor: '#38bdf8' } : undefined}
                >
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
              <div className="user-role">{user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="admin-container">
        <header className="admin-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="admin-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="header-search">
              <input type="text" placeholder="Global system search..." className="header-search-input" />
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CourseSwitcher />
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
        .sidebar-header {
          padding: 24px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .admin-sidebar-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          padding: 4px;
        }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-size: 20px; font-weight: 800; }
        .sidebar-nav { flex: 1; padding: 18px 0; overflow-y: auto; }
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
        .admin-container { flex: 1; margin-left: 260px; display: flex; flex-direction: column; width: calc(100% - 260px); }
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
        .admin-mobile-toggle {
          display: none;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px;
          color: #1e293b;
          cursor: pointer;
        }
        .admin-mobile-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(2px);
          z-index: 999;
        }
        @media (max-width: 768px) {
          .admin-mobile-toggle { display: flex; align-items: center; justify-content: center; }
          .admin-sidebar-close-btn { display: block; }
          .admin-mobile-backdrop { display: block; }
          .admin-sidebar {
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1001;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }
          .admin-container {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .admin-top-header {
            padding: 0 16px !important;
            height: 60px !important;
          }
          .header-search {
            display: none !important;
          }
          .admin-main-content {
            padding: 14px 10px !important;
            min-height: calc(100vh - 60px) !important;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminLayout
