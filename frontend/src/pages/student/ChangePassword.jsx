import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react'

const ChangePassword = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await userAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      
      setSuccess('Your password has been updated successfully!')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'coordinator' ? '/coordinator' : '/dashboard'
      
      setTimeout(() => {
        navigate(dashboardPath)
      }, 2000)
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password. Please check your current password.')
    } finally {
      setLoading(false)
    }
  }

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'coordinator' ? '/coordinator' : '/dashboard'

  return (
    <div className="admin-page fade-in">
      <div className="container py-12 max-w-lg">
        <header className="mb-8 text-center">
            <div className="flex-center gap-2 mb-2">
              <Link to={dashboardPath} className="back-link"><ChevronLeft className="icon-sm" /> Back to Portal</Link>
            </div>
            <div className="icon-box-modern bg-primary/10 text-primary mx-auto mb-4 w-16 h-16 rounded-2xl flex-center">
              <ShieldCheck className="icon-lg" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Settings</h1>
            <p className="text-slate-500">Keep your account secure by updating your password periodically.</p>
        </header>

        <div className="glass-card-modern p-8 shadow-xl">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div className="alert-error p-4 rounded-xl flex items-center gap-3 animate-shake">
                <AlertCircle className="icon-sm" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="alert-success-modern p-4 rounded-xl flex items-center gap-3 animate-slide-up">
                <CheckCircle2 className="icon-sm" />
                <span className="text-sm font-semibold">{success}</span>
              </div>
            )}

            <div className="form-group-modern">
              <label>Current Password</label>
              <div className="relative" style={{ position: 'relative' }}>
                <Lock className="absolute text-slate-400" size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-10"
                  style={{ boxSizing: 'border-box', paddingLeft: '38px', paddingRight: '38px' }}
                  required
                />
                <button 
                  type="button" 
                  className="absolute text-slate-400 hover:text-slate-600"
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group-modern">
              <label>New Password</label>
              <div className="relative" style={{ position: 'relative' }}>
                <Lock className="absolute text-slate-400" size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full pl-10"
                  style={{ boxSizing: 'border-box', paddingLeft: '38px' }}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group-modern">
              <label>Confirm New Password</label>
              <div className="relative" style={{ position: 'relative' }}>
                <Lock className="absolute text-slate-400" size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className="w-full pl-10"
                  style={{ boxSizing: 'border-box', paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            <div className="pt-4" style={{ marginTop: '10px' }}>
              <Button
                type="submit"
                variant="primary"
                className="w-full py-4 text-md font-black shadow-lg shadow-indigo-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex-center gap-2">
                    <div className="spinner-xs border-white/30 border-t-white"></div> Updating Security...
                  </span>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
           <p>Logged in as <span className="font-bold text-slate-600 uppercase">{user?.role}</span></p>
        </div>
      </div>

      <style>{`
        .admin-page { background: #f8fafc; min-height: 100vh; }
        .glass-card-modern { background: white; border-radius: 1.5rem; border: 1px solid #e2e8f0; }
        .form-group-modern label { display: block; font-size: 0.8125rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; }
        .form-group-modern input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.875rem; transition: all 0.2s; outline: none; }
        .form-group-modern input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .back-link { font-size: 0.75rem; color: #64748b; text-decoration: none; display: flex; align-items: center; gap: 0.25rem; font-weight: 700; text-transform: uppercase; }
        .alert-error { background: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; }
        .alert-success-modern { background: #f0fdf4; border: 1px solid #dcfce7; color: #166534; }
        
        .spinner-xs { width: 16px; height: 16px; border: 2px solid; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite alternate; animation-iteration-count: 2; }
      `}</style>
    </div>
  )
}

export default ChangePassword
