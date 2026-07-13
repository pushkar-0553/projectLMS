import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { messageAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import MessagingInterface from './MessagingInterface';
import ReactDOM from 'react-dom';

/**
 * MessagingIcon Component
 * Premium header icon with real-time unread count and smooth interface trigger.
 */
const MessagingIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerBounce, setTriggerBounce] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (socket) {
      // Listen for unread count updates
      socket.on('unread_messages_count', (data) => {
        setUnreadCount(data.count);
        if (data.count > unreadCount) {
          setTriggerBounce(true);
          setTimeout(() => setTriggerBounce(false), 1000);
        }
      });

      // Also listen for new messages to trigger bounce even if count doesn't change
      socket.on('new_message', () => {
        setTriggerBounce(true);
        setTimeout(() => setTriggerBounce(false), 1000);
      });

      return () => {
        socket.off('unread_messages_count');
        socket.off('new_message');
      };
    }
  }, [socket, unreadCount]);

  const fetchUnreadCount = async () => {
    try {
      const res = await messageAPI.getUnreadCount();
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  };

  return (
    <div className="messaging-icon-container">
      <button 
        onClick={() => setIsOpen(true)}
        className={`message-trigger ${triggerBounce ? 'bouncing' : ''}`}
      >
        <MessageCircle size={22} />
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {/* Messaging Modal Interface - Rendered via Portal at Body Level */}
      {isOpen && ReactDOM.createPortal(
        <MessagingInterface 
          onClose={() => {
            setIsOpen(false);
            fetchUnreadCount(); // Refresh count when closing
          }} 
        />,
        document.body
      )}

      <style>{`
        .messaging-icon-container {
          position: relative;
          display: inline-block;
        }

        .message-trigger {
          position: relative;
          padding: 8px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .message-trigger:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .message-trigger.bouncing {
          animation: bounce-animation 0.6s ease-in-out;
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

        @keyframes bounce-animation {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        @keyframes badge-pop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default MessagingIcon;
