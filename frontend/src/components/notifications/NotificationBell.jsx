import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, X, Clipboard, MessageSquare, Megaphone, 
  Calendar, CheckCircle, Clock, Inbox, ChevronRight
} from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

/**
 * NotificationBell Component
 * A premium, modern notification system featuring real-time updates via Socket.IO,
 * hierarchical role-based alerting, and high-fidelity UI/UX.
 */
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRing, setTriggerRing] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const socket = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        setTriggerRing(true);
        
        // Browser native notification fallback
        if (Notification.permission === "granted") {
          new Notification(notification.title, { body: notification.message });
        }
        
        // Reset ring animation after 1s
        setTimeout(() => setTriggerRing(false), 1000);
      };

      socket.on('new-notification', handleNewNotification);
      return () => socket.off('new-notification', handleNewNotification);
    }
  }, [socket]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      const data = res.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getNotificationConfig = (type) => {
    const size = 18;
    switch (type) {
      case 'task_assigned': 
        return { icon: <Clipboard size={size} />, color: '#6366f1', bg: '#eef2ff' }; // Indigo
      case 'message': 
        return { icon: <MessageSquare size={size} />, color: '#10b981', bg: '#ecfdf5' }; // Emerald
      case 'announcement': 
        return { icon: <Megaphone size={size} />, color: '#f59e0b', bg: '#fff7ed' }; // Amber
      case 'meeting': 
        return { icon: <Calendar size={size} />, color: '#8b5cf6', bg: '#f5f3ff' }; // Violet
      case 'submission_update': 
        return { icon: <CheckCircle size={size} />, color: '#22c55e', bg: '#f0fdf4' }; // Green
      default: 
        return { icon: <Bell size={size} />, color: '#64748b', bg: '#f8fafc' };
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      {/* Bell Icon & Badge */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`bell-trigger ${triggerRing ? 'ringing' : ''}`}
      >
        <Bell size={22} />
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {/* Header-anchored Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown slide-in-top">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              <X size={16} />
            </button>
          </div>

          <div className="notification-list custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const config = getNotificationConfig(n.type);
                return (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`notification-card ${!n.is_read ? 'unread' : ''}`}
                  >
                    {!n.is_read && <div className="unread-dot" />}
                    
                    <div className="card-icon" style={{ backgroundColor: config.bg, color: config.color }}>
                      {config.icon}
                    </div>

                    <div className="card-content">
                      <div className="card-top">
                        <span className="card-title truncate">{n.title}</span>
                      </div>
                      <p className="card-message">{n.message}</p>
                      <span className="card-time">{getTimeAgo(n.created_at)}</span>
                    </div>

                    <div className="card-chevron">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Inbox size={40} />
                </div>
                <h4>All caught up!</h4>
                <p>No new notifications at the moment.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .notification-bell-container {
          position: relative;
          display: inline-block;
        }

        .bell-trigger {
          position: relative;
          padding: 8px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .bell-trigger:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .bell-trigger.ringing {
          animation: ring-animation 0.8s ease-in-out;
        }

        .unread-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 800;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
          animation: badge-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: -8px;
          width: 380px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.25), 0 0 1px rgba(0,0,0,0.1);
          border: 1px solid #f1f5f9;
          z-index: 1000;
          overflow: hidden;
          transform-origin: top right;
        }

        .dropdown-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f8fafc;
        }

        .dropdown-header h3 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #64748b;
        }

        .notification-list {
          max-height: 420px;
          overflow-y: auto;
          background: #ffffff;
        }

        .notification-card {
          position: relative;
          padding: 14px 20px;
          display: flex;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          border-bottom: 1px solid #f8fafc;
        }

        .notification-card:hover {
          background: #f8fafc;
          transform: scale(0.99);
        }

        .notification-card.unread {
          background: rgba(99, 102, 241, 0.03);
        }

        .unread-dot {
          position: absolute;
          left: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: #6366f1;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
        }

        .card-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.02);
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .card-message {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 4px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-time {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
        }

        .card-chevron {
          display: flex;
          align-items: center;
          color: #cbd5e1;
          opacity: 0;
          transition: all 0.2s;
        }

        .notification-card:hover .card-chevron {
          opacity: 1;
          transform: translateX(4px);
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          color: #f1f5f9;
          margin-bottom: 12px;
        }

        .empty-state h4 {
          margin: 0;
          font-size: 15px;
          color: #334155;
        }

        .empty-state p {
          font-size: 13px;
          color: #94a3b8;
          margin: 4px 0 0 0;
        }

        @keyframes ring-animation {
          0% { transform: rotate(0); }
          10% { transform: rotate(20deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-5deg); }
          50% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }

        @keyframes badge-pop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }

        .slide-in-top {
          animation: slide-in-top 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slide-in-top {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default NotificationBell;
