import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  const navItems = [
    {
      path: user?.role === 'admin' ? '/admin' : '/dashboard',
      icon: '🏠',
      label: user?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'
    }
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">VCUBE LMS</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          🚪 Logout
        </button>
      </div>

      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 260px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          z-index: 1000;
        }

        .sidebar-header {
          padding: 30px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 28px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 0;
        }

        .nav-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-item {
          margin-bottom: 5px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px 25px;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .nav-link:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .nav-link.active {
          background: rgba(255,255,255,0.2);
          color: white;
          border-left-color: white;
        }

        .nav-icon {
          font-size: 20px;
          width: 25px;
        }

        .nav-label {
          font-size: 15px;
          font-weight: 500;
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .user-role {
          font-size: 12px;
          opacity: 0.8;
          text-transform: capitalize;
        }

        .logout-btn {
          width: 100%;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
          }

          .logo-text {
            display: none;
          }

          .nav-label {
            font-size: 13px;
          }

          .user-details {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .sidebar {
            width: 70px;
          }

          .logo-text {
            display: none;
          }

          .nav-label {
            display: none;
          }

          .nav-link {
            justify-content: center;
            padding: 15px;
          }

          .user-info {
            justify-content: center;
          }

          .user-details {
            display: none;
          }

          .logout-btn {
            padding: 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}

export default Sidebar
