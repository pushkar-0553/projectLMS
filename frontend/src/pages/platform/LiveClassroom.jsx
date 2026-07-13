// Live Classroom Component
// Student Execution & Mentorship Platform

import React, { useState, useEffect } from 'react';
import { Calendar, Users, Video, Clock, Eye, Settings } from 'lucide-react';
import platformAPI from '../../services/platformAPI';

const LiveClassroom = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await platformAPI.getSessions({ session_type: 'class' });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await platformAPI.startSession(sessionId);
      fetchSessions(); // Refresh the list
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      await platformAPI.endSession(sessionId);
      fetchSessions(); // Refresh the list
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
      case 'ended': return <Clock size={16} />;
      case 'cancelled': return <Settings size={16} />;
      default: return <Clock size={16} />;
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
        <h1 className="text-2xl font-bold text-gray-900">Live Classroom</h1>
        <p className="text-gray-600">Manage and join live classroom sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.session_status)}`}>
                {getStatusIcon(session.session_status)}
                <span className="ml-1">{session.session_status}</span>
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">{session.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-500">
                <Calendar size={16} className="mr-2" />
                <span>Start: {new Date(session.scheduled_start).toLocaleString()}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Clock size={16} className="mr-2" />
                <span>End: {new Date(session.scheduled_end).toLocaleString()}</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Users size={16} className="mr-2" />
                <span>Host: {session.host_name || 'Unknown'}</span>
              </div>
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

            <div className="mt-4 flex gap-2">
              {session.session_status === 'scheduled' && (
                <button
                  onClick={() => handleStartSession(session.id)}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Start Session
                </button>
              )}
              
              {session.session_status === 'live' && (
                <button
                  onClick={() => handleEndSession(session.id)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  End Session
                </button>
              )}
              
              <button
                onClick={() => setSelectedSession(session)}
                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <Eye size={16} className="mr-2" />
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <Video size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600">No live classroom sessions have been scheduled yet.</p>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
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
                  <p className="text-gray-600">{selectedSession.description || 'No description'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Session Type</h3>
                    <p className="text-gray-600 capitalize">{selectedSession.session_type}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Status</h3>
                    <p className="text-gray-600 capitalize">{selectedSession.session_status}</p>
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

                <div>
                  <h3 className="text-sm font-medium text-gray-900">Notes</h3>
                  <p className="text-gray-600">{selectedSession.notes || 'No notes'}</p>
                </div>
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

export default LiveClassroom;
