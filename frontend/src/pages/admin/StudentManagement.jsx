import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userAPI } from '../../services/api'
import Button from '../../components/common/Button'
import { 
  Users, 
  UserPlus, 
  Upload, 
  Trash2, 
  Search, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  Loader2,
  MoreVertical,
  Filter,
  Eye
} from 'lucide-react'
import * as XLSX from 'xlsx'

const StudentManagement = () => {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    batch: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await userAPI.getAllStudents()
      setStudents(response.data)
    } catch (error) {
      console.error('Failed to fetch students:', error)
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

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      setError('Name and Email are required')
      return
    }

    setProcessing(true)
    try {
      await userAPI.createStudent({
        ...formData,
        password: 'student123'
      })
      
      setSuccess(`Student ${formData.name} created successfully!`)
      setFormData({ name: '', email: '', mobile: '', batch: '' })
      setShowCreateForm(false)
      fetchStudents()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create student')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await userAPI.deleteStudent(studentId)
        fetchStudents()
      } catch (error) {
        console.error('Failed to delete student:', error)
        alert('Failed to delete student.')
      }
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        setProcessing(true)
        setError('')
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        // Map excel columns to our fields
        // Expecting columns: Name, Email, Mobile, Batch
        const mappedData = data.map(row => ({
          name: row.Name || row.name || row['Full Name'],
          email: row.Email || row.email || row['Email ID'],
          mobile: row.Mobile || row.mobile || row['Phone'] || '',
          batch: row.Batch || row.batch || '',
          password: 'student123'
        })).filter(s => s.name && s.email)

        if (mappedData.length === 0) {
          throw new Error('No valid student data found in the Excel file. Please ensure you have Name and Email columns.')
        }

        const response = await userAPI.bulkCreateStudents(mappedData)
        setSuccess(response.data.message)
        setShowBulkUpload(false)
        fetchStudents()
      } catch (err) {
        setError(err.message || 'Failed to process Excel file')
      } finally {
        setProcessing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  const downloadTemplate = () => {
    const template = [
      { 'Full Name': 'John Doe', 'Email ID': 'john@example.com', 'Mobile': '9876543210', 'Batch': '2024' },
      { 'Full Name': 'Jane Smith', 'Email ID': 'jane@example.com', 'Mobile': '9876543211', 'Batch': '2024' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Students Template")
    XLSX.writeFile(wb, "student_upload_template.xlsx")
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.batch && s.batch.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="loader-container">
        <Loader2 className="spinner animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="admin-page fade-in">
      <header className="page-header-modern">
        <div className="container">
          <div className="flex-between flex-wrap gap-6">
            <div className="header-left">
              <div className="flex-center gap-2 mb-2">
                <Link to="/admin" className="back-link"><ChevronLeft className="icon-sm" /> Back</Link>
                <span className="badge badge-indigo">Administration</span>
              </div>
              <h1 className="header-title-modern">Student Management</h1>
              <p className="text-muted">Register students individually or in bulk via Excel.</p>
            </div>
            
            <div className="header-actions">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkUpload(true)}
                className="btn-icon-left"
              >
                <Upload className="icon-sm" /> Bulk Upload
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateForm(true)}
                className="btn-icon-left"
              >
                <UserPlus className="icon-sm" /> Add Student
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content-modern">
        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="modal-overlay">
            <div className="modal-content glass shadow-2xl slide-up">
              <div className="flex-between mb-6">
                <h2 className="text-xl font-bold flex-center gap-2">
                  <FileSpreadsheet className="text-emerald-500" /> Bulk student upload
                </h2>
                <button onClick={() => setShowBulkUpload(false)} className="close-btn"><X /></button>
              </div>
              
              <div className="upload-zone text-center p-12 border-dashed rounded-2xl mb-6">
                <Upload className="icon-xl text-primary opacity-20 mx-auto mb-4" />
                <p className="font-bold mb-1">Select an Excel (.xlsx) file</p>
                <p className="text-xs text-muted mb-6">File should contain Name, Email, Mobile, and Batch columns.</p>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  id="excel-upload"
                />
                <div className="flex-center gap-4">
                  <Button variant="primary" onClick={() => fileInputRef.current.click()} disabled={processing}>
                    {processing ? 'Processing...' : 'Choose File'}
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="icon-sm mr-2" /> Template
                  </Button>
                </div>
              </div>

              {error && (
                <div className="alert-error flex gap-3 p-4 rounded-xl mb-4">
                  <AlertCircle className="icon-sm mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Student Form (Drawer Style or Modal) */}
        {showCreateForm && (
          <div className="modal-overlay">
            <div className="modal-content glass shadow-2xl slide-up max-w-md">
              <div className="flex-between mb-6">
                <h2 className="text-xl font-bold">New Student</h2>
                <button onClick={() => setShowCreateForm(false)} className="close-btn"><X /></button>
              </div>
              
              <form onSubmit={handleCreateStudent}>
                <div className="grid gap-5">
                  <div className="form-group-modern">
                    <label>Full Name</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Ex: John Doe" required />
                  </div>
                  <div className="form-group-modern">
                    <label>Email ID</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group-modern">
                      <label>Mobile</label>
                      <input name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="9999999999" />
                    </div>
                    <div className="form-group-modern">
                      <label>Batch</label>
                      <input name="batch" value={formData.batch} onChange={handleInputChange} placeholder="B-01" />
                    </div>
                  </div>
                </div>
                
                <div className="info-box-indigo mt-6 mb-8">
                   <p className="text-xs">Password will be set to <code className="font-bold">student123</code> by default.</p>
                </div>

                <Button type="submit" variant="primary" className="w-full" disabled={processing}>
                  {processing ? 'Creating...' : 'Create Account'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Filters and List */}
        <div className="list-controls-modern mb-6 flex-between flex-wrap gap-4">
          <div className="search-box-modern shadow-sm">
            <Search className="search-icon" />
            <input 
              placeholder="Search by name, email or batch..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-muted text-sm">
             <Users className="icon-xs" /> <strong>{filteredStudents.length}</strong> Students
          </div>
        </div>

        {success && (
          <div className="alert-success-modern slide-up mb-6 shadow-sm">
             <CheckCircle2 className="icon-sm" /> {success}
             <button onClick={() => setSuccess('')} className="ml-auto opacity-50 hover:opacity-100"><X className="icon-xs" /></button>
          </div>
        )}

        <div className="card-modern overflow-hidden shadow-soft border border-slate-100">
          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Batch</th>
                  <th>Contact</th>
                  <th>Joined Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-20 text-muted">
                       <Users className="icon-xl opacity-10 mx-auto mb-4" />
                       <p>No students found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar-initials bg-indigo-100 text-indigo-700 font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{student.name}</div>
                            <div className="text-xs text-muted">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-emerald-soft">{student.batch || 'General'}</span>
                      </td>
                      <td className="text-sm text-slate-600">
                        {student.mobile || '-'}
                      </td>
                      <td className="text-sm text-slate-500">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                         <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="small"
                              onClick={() => navigate(`/admin/student/${student.id}`)}
                              className="text-indigo-600 hover:bg-indigo-50"
                            >
                              <Eye className="icon-xs mr-1" /> Profile
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="small"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="icon-xs" />
                            </Button>
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

      <style>{`
        .admin-page { background-color: #f8fafc; min-height: 100vh; padding-bottom: 5rem; }
        
        .page-header-modern { background: white; padding: 2.5rem 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 2.5rem; }
        .back-link { font-size: 0.75rem; color: #64748b; text-decoration: none; display: flex; align-items: center; gap: 0.25rem; font-weight: 700; text-transform: uppercase; }
        .header-title-modern { font-size: 2.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; margin: 0.25rem 0; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem; }
        .modal-content { background: white; border-radius: 1.5rem; width: 100%; max-width: 600px; padding: 2.5rem; position: relative; }
        .close-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; border-radius: 0.5rem; padding: 0.5rem; transition: all 0.2s; }
        .close-btn:hover { background: #f1f5f9; color: #0f172a; }
        
        .upload-zone { background: #f8fafc; border: 2px dashed #e2e8f0; cursor: pointer; transition: all 0.2s; }
        .upload-zone:hover { border-color: #4f46e5; background: #f0f9ff; }
        
        .form-group-modern { margin-bottom: 1rem; }
        .form-group-modern label { display: block; font-size: 0.8125rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; }
        .form-group-modern input { width: 100%; padding: 0.75rem 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.9375rem; outline: none; transition: all 0.2s; }
        .form-group-modern input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        
        .info-box-indigo { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 1rem; border-radius: 0.5rem; color: #3730a3; }
        .alert-success-modern { background: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 1rem 1.5rem; border-radius: 1rem; display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 0.875rem; }
        .alert-error { background: #fef2f2; border: 1px solid #ef4444; color: #991b1b; }
        
        .search-box-modern { position: relative; width: 400px; }
        .search-box-modern input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem; border: 1px solid #e2e8f0; border-radius: 0.875rem; font-size: 0.875rem; outline: none; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; width: 18px; }
        
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { background: #f8fafc; padding: 1rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .modern-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        
        .avatar-initials { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .badge-indigo { background: #eef2ff; color: #4f46e5; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
        .badge-emerald-soft { background: #ecfdf5; color: #10b981; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; }
        
        .text-danger { color: #ef4444; }
        .hover-bg-danger-soft:hover { background: #fef2f2 !important; }

        @media (max-width: 900px) {
          .create-student-form .grid { grid-template-columns: 1fr; }
          .search-box-modern { width: 100%; }
        }
      `}</style>
    </div>
  )
}

export default StudentManagement
