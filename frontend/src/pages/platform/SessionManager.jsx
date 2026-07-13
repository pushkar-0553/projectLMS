// Session Manager Component
// Student Execution & Mentorship Platform

import React, { useState, useEffect } from 'react';
import { Calendar, Video, Users, Clock, Plus, Edit, Trash2, Play, Square } from 'lucide-react';
import platformAPI from '../../services/platformAPI';

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type: 'class',
    batch_id: '',
    scheduled_start: '',
    scheduled_end: '',
    max_participants: 50
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      await platformAPI.createSession(formData);
      fetchSessions();
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        session_type: 'class',
        batch_id: '',
        scheduled_start: '',
        scheduled_end: '',
        max_participants: 50
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await platformAPI.startSession(sessionId);
      fetchSessions();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      await platformAPI.endSession(sessionId);
      fetchSessions();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Calendar size={16} />;
      case 'live': return <Video size={16} />;
      case 'ended': return <Square size={16} />;
      case 'cancelled': return <Trash2 size={16} />;
      default: return <Calendar size={16} />;
    }
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case 'class': return 'bg-purple-100 text-purple-800';
      case 'mock_interview': return 'bg-orange-100 text-orange-800';
      case 'mentoring': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Session Manager</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-2" />
            Create Session
          </button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {getStatusIcon(session.session_status)}
                  <h3 className="ml-2 text-lg font-semibold text-gray-900">{session.title}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(session.session_type)}`}>
                    {session.session_type.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.session_status)}`}>
                    {session.session_status}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {session.session_status === 'scheduled' && (
                  <button
                    onClick={() => handleStartSession(session.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Play size={16} />
                  </button>
                )}
                {session.session_status === 'live' && (
                  <button
                    onClick={() => handleEndSession(session.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Square size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedSession(session)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar size={16} className="mr-2" />
                <span>Start: {new Date(session.scheduled_start).toLocaleString()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={16} className="mr-2" />
                <span>End: {new Date(session.scheduled_end).toLocaleString()}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users size={16} className="mr-2" />
                <span>Participants: {session.current_participants || 0}/{session.max_participants}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Video size={16} className="mr-2" />
                <span>Host: {session.host_name || 'Unknown'}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-gray-600">{session.description}</p>
            </div>

            {session.meeting_link && (
              <div className="mt-4">
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Video size={16} className="mr-2" />
                  Join Session
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600">No sessions have been scheduled yet.</p>
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Session</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter session title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter session description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.session_type}
                      onChange={(e) => setFormData({...formData, session_type: e.target.value})}
                    >
                      <option value="class">Class</option>
                      <option value="mock_interview">Mock Interview</option>
                      <option value="mentoring">Mentoring</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                      placeholder="Enter max participants"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.scheduled_start}
                      onChange={(e) => setFormData({...formData, scheduled_start: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.scheduled_end}
                      onChange={(e) => setFormData({...formData, scheduled_end: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedSession.title}</h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Description</h3>
                  <p className="text-gray-600">{selectedSession.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Session Type</h3>
                    <p className="text-gray-600">{selectedSession.session_type}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Status</h3>
                    <p className="text-gray-600">{selectedSession.session_status}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Start Time</h3>
                    <p className="text-gray-600">{new Date(selectedSession.scheduled_start).toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">End Time</h3>
                    <p className="text-gray-600">{new Date(selectedSession.scheduled_end).toLocaleString()}</p>
                  </div>
                </div>

                {selectedSession.meeting_link && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Meeting Link</h3>
                    <a
                      href={selectedSession.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline"
                    >
                      {selectedSession.meeting_link}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
