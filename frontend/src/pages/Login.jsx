import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import { Mail, Lock, LogIn, ShieldCheck, AlertCircle } from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)

      if (result.success) {
        const userRole = result.user?.role
        if (userRole === 'admin') {
          navigate('/admin')
        } else if (userRole === 'coordinator') {
          navigate('/coordinator')
        } else if (userRole === 'faculty') {
          navigate('/faculty')
        } else {
          navigate('/dashboard')
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root fade-in">
      <div className="auth-background">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>
      
      <div className="login-container">
        <div className="login-glass-card shadow-2xl">
          <div className="login-header">
            <div className="brand-icon-wrapper mb-6">
              <ShieldCheck className="brand-icon text-white" />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Enter your credentials to access your portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group mb-6">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@university.edu"
                  required
                />
              </div>
            </div>

            <div className="form-group mb-8">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="error-alert mb-6">
                <AlertCircle className="icon-sm" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <span className="flex-center gap-2">
                  <div className="spinner-xs"></div> Processing
                </span>
              ) : (
                <span className="flex-center gap-2">
                  <LogIn className="icon-sm" /> Sign In
                </span>
              )}
            </Button>
          </form>

          <footer className="login-footer">
            <p className="text-muted text-xs italic">
              New student? Please contact your Lab Coordinator to get started.
            </p>
          </footer>
        </div>
      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .auth-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .circle-1 {
          width: 500px;
          height: 500px;
          background: #4f46e5;
          top: -250px;
          right: -100px;
        }

        .circle-2 {
          width: 400px;
          height: 400px;
          background: #10b981;
          bottom: -200px;
          left: -100px;
        }

        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 2rem;
        }

        .login-glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 2rem;
          padding: 3rem 2.5rem;
          color: white;
        }

        .brand-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
        }

        .brand-icon { width: 32px; height: 32px; }

        .login-header { text-align: center; margin-bottom: 2.5rem; }
        .login-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.5rem; }
        .login-subtitle { color: #94a3b8; font-size: 0.875rem; }

        .form-group label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 0.5rem;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #64748b;
        }

        .input-with-icon input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.875rem;
          color: white;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .input-with-icon input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .login-submit-btn {
          width: 100%;
          padding: 1rem !important;
          border-radius: 0.875rem !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          background: linear-gradient(to right, #4f46e5, #4338ca) !important;
          border: none !important;
        }

        .login-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
        }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
        }

        .spinner-xs {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .login-container { padding: 1rem; }
          .login-glass-card { padding: 2.5rem 1.5rem; }
        }
      `}</style>
    </div>
  )
}

export default Login
