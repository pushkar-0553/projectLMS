import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { userAPI } from '../../services/api'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { Plus, X, Layers, UserCheck, Search, Shield } from 'lucide-react'

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    batch: '', // For faculty, this could be Department
    password: ''
  })
  const [batches, setBatches] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchFaculties()
  }, [])

  const fetchFaculties = async () => {
    try {
      const [facRes, batchesRes] = await Promise.all([
        userAPI.getAllFaculties(),
        userAPI.getAllBatchesForAssignment()
      ])
      setFaculties(facRes.data)
      setBatches(batchesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
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

  const handleCreateFaculty = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      setError('Name and email are required')
      return
    }

    try {
      await userAPI.createFaculty({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        batch: formData.batch,
        password: formData.password || 'faculty123'
      })
      
      setSuccess(`Faculty ${formData.name} created successfully! Default password: ${formData.password || 'faculty123'}`)
      setFormData({ name: '', email: '', mobile: '', batch: '', password: '' })
      setShowCreateForm(false)
      fetchFaculties()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create faculty')
    }
  }

  const handleAssignBatch = async () => {
    if (!selectedBatch) return
    try {
      await userAPI.assignFacultyToBatch(selectedFaculty.id, selectedBatch)
      setSuccess(`Assigned ${selectedFaculty.name} to batch successfully!`)
      setShowAssignModal(false)
      setSelectedBatch('')
      fetchFaculties()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to assign batch')
    }
  }

  const handleRemoveBatch = async (facultyId, batchId) => {
    if (!window.confirm('Remove this faculty from this batch?')) return
    try {
      await userAPI.removeFacultyFromBatch(facultyId, batchId)
      setSuccess('Batch assignment removed.')
      fetchFaculties()
    } catch (error) {
      setError('Failed to remove batch assignment.')
    }
  }

  const handleDeleteFaculty = async (facultyId) => {
    if (window.confirm('Are you sure you want to delete this faculty member?')) {
      try {
        await userAPI.deleteCoordinator(facultyId) // deleteCoordinator works for any user ID
        fetchFaculties()
        setSuccess('Faculty member deleted successfully!')
      } catch (error) {
        console.error('Failed to delete faculty:', error)
        setError('Failed to delete faculty. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="faculty-management loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="faculty-management">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Faculty Management</h1>
              <p>Create and manage faculty (mentor) accounts</p>
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
                {showCreateForm ? 'Cancel' : 'Add New Faculty'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {showCreateForm && (
          <Card className="create-faculty-card">
            <h2>Create New Faculty Account</h2>
            <p className="info-text">Default password will be: <strong>faculty123</strong></p>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <form onSubmit={handleCreateFaculty} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fac-name">Full Name *</label>
                  <input
                    type="text"
                    id="fac-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter faculty name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fac-email">Email ID *</label>
                  <input
                    type="email"
                    id="fac-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter faculty email"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fac-mobile">Mobile Number</label>
                  <input
                    type="tel"
                    id="fac-mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="fac-batch">Department / Specialization</label>
                  <input
                    type="text"
                    id="fac-batch"
                    name="batch"
                    value={formData.batch}
                    onChange={handleInputChange}
                    placeholder="Enter department or specialization"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fac-password">Password (optional)</label>
                  <input
                    type="password"
                    id="fac-password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave empty for default: faculty123"
                  />
                </div>
              </div>

              <div className="form-actions">
                <Button type="submit" variant="primary" size="large">
                  Create Faculty Account
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!showCreateForm && error && <div className="error-message standalone">{error}</div>}
        {!showCreateForm && success && <div className="success-message standalone">{success}</div>}

        <Card>
          <h2>Faculty / Mentors ({faculties.length})</h2>
          <div className="faculties-table">
            {faculties.length === 0 ? (
              <div className="empty-state">
                <p>No faculty accounts found. Add your first mentor!</p>
                <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                  Add Faculty
                </Button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned Batches</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((faculty) => (
                    <tr key={faculty.id}>
                      <td>
                        <div className="faculty-info">
                          <div className="avatar">
                            {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                          </div>
                          <div>
                            <strong>{faculty.name}</strong>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: FAC-{faculty.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{faculty.email}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {faculty.batches && faculty.batches.length > 0 ? (
                            faculty.batches.map(b => (
                              <div key={b.id} className="batch-tag">
                                {b.name}
                                <button onClick={() => handleRemoveBatch(faculty.id, b.id)} className="remove-tag">&times;</button>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">No batches assigned</span>
                          )}
                          <button 
                            className="add-batch-btn"
                            onClick={() => {
                              setSelectedFaculty(faculty)
                              setShowAssignModal(true)
                            }}
                          >
                            <Plus size={10} /> Assign
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="dept-badge">{faculty.batch || 'General'}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Button 
                            variant="danger" 
                            size="small"
                            onClick={() => handleDeleteFaculty(faculty.id)}
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

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Assign Batch to {selectedFaculty?.name}</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Select Batch</label>
                <select 
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Choose a Batch --</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <Button 
                variant="primary" 
                fullWidth 
                disabled={!selectedBatch}
                onClick={handleAssignBatch}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .batch-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
        }
        .remove-tag {
          color: #94a3b8;
          font-weight: 400;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .remove-tag:hover { color: #e11d48; }
        .add-batch-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #eff6ff;
          border: 1px dashed #60a5fa;
          color: #2563eb;
          font-size: 10px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-batch-btn:hover { background: #dbeafe; }
        .faculty-management {
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

        .create-faculty-card {
          margin-bottom: 30px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
        }

        .create-faculty-card h2 {
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

        .faculties-table {
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

        .faculty-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .faculty-info .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .faculty-info strong {
          color: #333;
        }

        .dept-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background-color: #e0e7ff;
          color: #4338ca;
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

export default FacultyManagement
