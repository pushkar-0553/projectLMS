import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { userAPI } from '../../services/api'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const CoordinatorManagement = () => {
  const [coordinators, setCoordinators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    batch: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchCoordinators()
  }, [])

  const fetchCoordinators = async () => {
    try {
      const response = await userAPI.getAllCoordinators()
      setCoordinators(response.data)
    } catch (error) {
      console.error('Failed to fetch coordinators:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const handleCreateCoordinator = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      setError('Name and email are required')
      return
    }

    try {
      await userAPI.createCoordinator({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        batch: formData.batch,
        password: formData.password || 'coordinator123'
      })
      
      setSuccess(`Coordinator ${formData.name} created successfully! Default password: ${formData.password || 'coordinator123'}`)
      setFormData({ name: '', email: '', mobile: '', batch: '', password: '' })
      setShowCreateForm(false)
      fetchCoordinators()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create coordinator')
    }
  }

  const handleDeleteCoordinator = async (coordinatorId) => {
    if (window.confirm('Are you sure you want to delete this coordinator?')) {
      try {
        await userAPI.deleteCoordinator(coordinatorId)
        fetchCoordinators()
        setSuccess('Coordinator deleted successfully!')
      } catch (error) {
        console.error('Failed to delete coordinator:', error)
        setError('Failed to delete coordinator. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="coordinator-management loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="coordinator-management">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Coordinator Management</h1>
              <p>Create and manage lab coordinator accounts</p>
            </div>
            <div className="header-actions">
              <Link to="/admin">
                <Button variant="secondary">
                  Back to Dashboard
                </Button>
              </Link>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? 'Cancel' : 'Add New Coordinator'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {showCreateForm && (
          <Card className="create-coordinator-card">
            <h2>Create New Coordinator Account</h2>
            <p className="info-text">Default password will be: <strong>coordinator123</strong></p>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleCreateCoordinator} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coord-name">Full Name *</label>
                  <input
                    type="text"
                    id="coord-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter coordinator name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="coord-email">Email ID *</label>
                  <input
                    type="email"
                    id="coord-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter coordinator email"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coord-mobile">Mobile Number</label>
                  <input
                    type="tel"
                    id="coord-mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="coord-batch">Department / Batch</label>
                  <input
                    type="text"
                    id="coord-batch"
                    name="batch"
                    value={formData.batch}
                    onChange={handleInputChange}
                    placeholder="Enter department or batch"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coord-password">Password (optional)</label>
                  <input
                    type="password"
                    id="coord-password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave empty for default: coordinator123"
                  />
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit" variant="primary" size="large">
                  Create Coordinator Account
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!showCreateForm && error && <div className="error-message standalone">{error}</div>}
        {!showCreateForm && success && <div className="success-message standalone">{success}</div>}

        <Card>
          <h2>Lab Coordinators ({coordinators.length})</h2>
          <div className="coordinators-table">
            {coordinators.length === 0 ? (
              <div className="empty-state">
                <p>No coordinators found. Add your first coordinator!</p>
                <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                  Add Coordinator
                </Button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Department</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinators.map((coordinator) => (
                    <tr key={coordinator.id}>
                      <td>
                        <div className="coordinator-info">
                          <div className="avatar">
                            {coordinator.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <strong>{coordinator.name}</strong>
                        </div>
                      </td>
                      <td>{coordinator.email}</td>
                      <td>{coordinator.mobile || 'Not provided'}</td>
                      <td>
                        <span className="dept-badge">{coordinator.batch || 'N/A'}</span>
                      </td>
                      <td>{new Date(coordinator.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <Button 
                            variant="danger" 
                            size="small"
                            onClick={() => handleDeleteCoordinator(coordinator.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        .coordinator-management {
          min-height: 100vh;
          background-color: #f8f9fa;
          padding: 20px 0;
        }

        .page-header {
          background: white;
          border-bottom: 1px solid #eee;
          padding: 20px 0;
          margin-bottom: 30px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 5px;
        }

        .header-content p {
          color: #666;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .create-coordinator-card {
          margin-bottom: 30px;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
        }

        .create-coordinator-card h2 {
          color: white;
          margin-bottom: 10px;
        }

        .info-text {
          margin-bottom: 20px;
          opacity: 0.9;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .error-message.standalone,
        .success-message.standalone {
          max-width: 1200px;
          margin: 0 auto 20px auto;
        }

        .create-form {
          margin-top: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: white;
        }

        .form-group input {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
        }

        .form-group input:focus {
          outline: 2px solid rgba(255,255,255,0.5);
        }

        .form-actions {
          text-align: center;
          margin-top: 30px;
        }

        .coordinators-table {
          overflow-x: auto;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .empty-state p {
          font-size: 18px;
          margin-bottom: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .coordinator-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .coordinator-info .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #11998e, #38ef7d);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .coordinator-info strong {
          color: #333;
        }

        .dept-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background-color: #e8f5e9;
          color: #2e7d32;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default CoordinatorManagement
