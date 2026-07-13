import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { UserPlus, Search, Shield, GraduationCap, Mail, Phone, MoreVertical, Trash2, Users, Layout } from 'lucide-react';
import Button from '../../components/common/Button';

const UserManagement = () => {
  const [users, setUsers] = useState({ coordinators: [], students: [], faculties: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', mobile: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('student');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [coords, students, faculties] = await Promise.all([
        adminAPI.getCoordinators(),
        adminAPI.getStudents(),
        adminAPI.getFaculties()
      ]);
      setUsers({ 
        coordinators: coords.data, 
        students: students.data, 
        faculties: faculties.data 
      });
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'student', mobile: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const filteredUsers = activeTab === 'student' 
    ? users.students.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    : activeTab === 'coordinator'
    ? users.coordinators.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    : users.faculties.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="user-management-page fade-in">
      {/* Header Section */}
      <header className="page-header">
        <div className="header-bg"></div>
        <div className="container header-container">
          <div className="header-content">
            <div className="welcome-text">
              <h1>User Management</h1>
              <p>Administer hierarchical access and manage identities for the institutional environment.</p>
            </div>
            <div className="header-actions">
              <Button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <UserPlus size={18} />
                Add New User
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <div className="users-card card slide-up">
          <div className="card-controls">
            {/* Custom Tabs */}
            <div className="tab-navigation">
              <button 
                onClick={() => setActiveTab('student')}
                className={`nav-tab ${activeTab === 'student' ? 'active' : ''}`}
              >
                <GraduationCap size={18} />
                <span>Students</span>
                <span className="count-badge">{users.students.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('coordinator')}
                className={`nav-tab ${activeTab === 'coordinator' ? 'active' : ''}`}
              >
                <Shield size={18} />
                <span>Coordinators</span>
                <span className="count-badge">{users.coordinators.length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('faculty')}
                className={`nav-tab ${activeTab === 'faculty' ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>Faculties</span>
                <span className="count-badge">{users.faculties.length}</span>
              </button>
            </div>

            {/* Search */}
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}s...`} 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="modern-table users-table">
              <thead>
                <tr>
                  <th>Identity Details</th>
                  <th>Contact Information</th>
                  <th>Privileges</th>
                  <th>Onboarding Date</th>
                  <th className="text-right">Operations</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td colSpan="5"><div className="skeleton-bar"></div></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state-inner">
                        <div className="empty-icon-wrapper">
                          <Users size={48} />
                        </div>
                        <h3>No {activeTab}s recorded</h3>
                        <p>Begin by adding your first institutional {activeTab} User.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td>
                        <div className="identity-cell">
                          <div className={`user-avatar ${activeTab === 'student' ? 'student-avatar' : activeTab === 'coordinator' ? 'coordinator-avatar' : 'faculty-avatar'}`}>
                            {user.name.charAt(0)}
                          </div>
                          <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-uid">ID: {user.id.toString().padStart(4, '0')}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-list">
                          <div className="contact-item">
                            <Mail size={14} className="contact-icon" />
                            <span>{user.email}</span>
                          </div>
                          {user.mobile && (
                            <div className="contact-item">
                              <Phone size={14} className="contact-icon" />
                              <span>{user.mobile}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${activeTab === 'student' ? 'badge-primary' : activeTab === 'coordinator' ? 'badge-warning' : 'badge-success'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Layout size={14} className="text-muted" />
                          <span>{new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button className="btn-icon">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content slide-up">
            <div className="modal-header">
              <div className="header-icon-box">
                <UserPlus size={24} />
              </div>
              <div className="header-meta">
                <h2>Secure Identity Creation</h2>
                <p>Initialize a new user profile with specific institutional role.</p>
              </div>
            </div>
            
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Institutional Role</label>
                  <div className="role-selector">
                    <button 
                      type="button" 
                      className={`role-btn ${newUser.role === 'student' ? 'active' : ''}`}
                      onClick={() => setNewUser({...newUser, role: 'student'})}
                    >
                      <GraduationCap size={18} />
                      Student
                    </button>
                    <button 
                      type="button" 
                      className={`role-btn ${newUser.role === 'coordinator' ? 'active' : ''}`}
                      onClick={() => setNewUser({...newUser, role: 'coordinator'})}
                    >
                      <Shield size={18} />
                      Coordinator
                    </button>
                    <button 
                      type="button" 
                      className={`role-btn ${newUser.role === 'faculty' ? 'active' : ''}`}
                      onClick={() => setNewUser({...newUser, role: 'faculty'})}
                    >
                      <Users size={18} />
                      Faculty
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Legal Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Alexander Pierce"
                    className="form-control"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="name@domain.com"
                    className="form-control"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Secure Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="form-control"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000"
                    className="form-control"
                    value={newUser.mobile}
                    onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary-simple"
                >
                  Discard Changes
                </button>
                <Button 
                  type="submit"
                  className="btn-primary"
                >
                  Register Identity
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .user-management-page {
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .page-header {
          position: relative;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 3rem 0;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; right: 0; height: 100%;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
          z-index: 0;
        }

        .header-container {
          position: relative;
          z-index: 1;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .welcome-text h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }

        .welcome-text p {
          color: #64748b;
          font-size: 1.1rem;
        }

        .main-content {
          padding-bottom: 5rem;
        }

        .users-card {
          padding: 0 !important;
          overflow: hidden;
        }

        .card-controls {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
          background: white;
        }

        .tab-navigation {
          display: flex;
          background: #f1f5f9;
          padding: 0.4rem;
          border-radius: 0.875rem;
          gap: 0.25rem;
        }

        .nav-tab {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1.25rem;
          border-radius: 0.625rem;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-tab.active {
          background: white;
          color: #4f46e5;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .count-badge {
          background: #eef2ff;
          color: #4f46e5;
          padding: 0.125rem 0.5rem;
          border-radius: 2rem;
          font-size: 0.75rem;
        }

        .nav-tab.active .count-badge {
          background: #4f46e5;
          color: white;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          background: white;
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .modern-table th {
          padding: 1.25rem 2rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modern-table td {
          padding: 1.25rem 2rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .table-row {
          transition: background-color 0.2s;
        }

        .table-row:hover {
          background-color: #f8fafc;
        }

        .identity-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          font-size: 1.1rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .student-avatar { background: linear-gradient(135deg, #4f46e5, #818cf8); }
        .coordinator-avatar { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
        .faculty-avatar { background: linear-gradient(135deg, #10b981, #34d399); }

        .user-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
          display: block;
        }

        .user-uid {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          color: #475569;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .contact-icon {
          color: #94a3b8;
        }

        .date-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 560px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .modal-header {
          padding: 2rem;
          background: #fafaf9;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-icon-box {
          width: 56px;
          height: 56px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-meta h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .header-meta p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .modal-form {
          padding: 2rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .form-group.full {
          grid-column: span 2;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .role-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .role-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .role-btn.active {
          background: #eef2ff;
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .modal-actions {
          margin-top: 2rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .btn-secondary-simple {
          background: transparent;
          border: none;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
        }

        .btn-secondary-simple:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .skeleton-row { height: 72px; }
        .skeleton-bar {
          height: 16px;
          background: #f1f5f9;
          border-radius: 8px;
          width: 100%;
        }

        .empty-state-inner {
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .empty-icon-wrapper {
          width: 64px;
          height: 64px;
          background: #f1f5f9;
          color: #cbd5e1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 1024px) {
          .search-wrapper { max-width: none; width: 100%; order: 2; }
          .tab-navigation { order: 1; }
        }

        @media (max-width: 768px) {
          .header-content { flex-direction: column; align-items: flex-start; }
          .search-wrapper { width: 100%; }
          .card-controls { flex-direction: column; align-items: stretch; }
          .tab-navigation { width: 100%; overflow-x: auto; }
          .form-grid { grid-template-columns: 1fr; }
          .form-group.full { grid-column: auto; }
          .modern-table th, .modern-table td { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;

