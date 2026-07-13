// Notification Center Component
// Student Execution & Mentorship Platform

import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, X, AlertCircle, Info, Clock, Archive, Settings, Video, AlertTriangle } from 'lucide-react';
import platformAPI from '../../services/platformAPI';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    
    // Polling for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate unread count
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await platformAPI.markNotificationRead(notificationId);
      fetchNotifications(); // Refresh list
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await platformAPI.markAllNotificationsRead();
      fetchNotifications(); // Refresh list
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await platformAPI.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'class_reminder': return <Clock size={16} className="text-blue-500" />;
      case 'deadline': return <AlertCircle size={16} className="text-orange-500" />;
      case 'interview': return <Video size={16} className="text-purple-500" />;
      case 'feedback': return <CheckCircle size={16} className="text-green-500" />;
      case 'alert': return <AlertTriangle size={16} className="text-red-500" />;
      case 'general': return <Info size={16} className="text-gray-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      case 'urgent': return 'Urgent';
      default: return 'Low';
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.notification_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center space-x-4">
            <span className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </span>
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
            >
              <Archive className="w-4 h-4 mr-1.5" />
              <span>Mark All Read</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'unread' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('class_reminder')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'class_reminder' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Class Reminders
          </button>
          <button
            onClick={() => setFilter('deadline')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'deadline' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Deadlines
          </button>
          <button
            onClick={() => setFilter('interview')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'interview' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Interviews
          </button>
          <button
            onClick={() => setFilter('feedback')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'feedback' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Feedback
          </button>
          <button
            onClick={() => setFilter('alert')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'alert' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setFilter('general')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'general' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            General
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 bg-white rounded-lg border ${
              notification.is_read ? 'border-gray-200 bg-gray-50' : 'border-indigo-200 bg-blue-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                {getNotificationIcon(notification.notification_type)}
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                  {notification.sender_name && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Sent by: {notification.sender_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                  {getPriorityLabel(notification.priority)}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              {!notification.is_read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              <button
                onClick={() => deleteNotification(notification.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'You have no notifications at this time.' 
              : `You have no ${filter} notifications.`}
          </p>
        </div>
      )}

      {/* Notification Settings */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <Settings size={16} className="mr-2" />
          Notification Settings
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>Notifications are automatically updated when:</p>
          <ul className="list-disc list-disc-inside ml-4">
            <li>New sessions are scheduled</li>
            <li>Deadlines are approaching</li>
            <li>Interview evaluations are completed</li>
            <li>Performance alerts are triggered</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
