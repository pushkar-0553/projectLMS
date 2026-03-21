import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProjectsManagement from './pages/admin/ProjectsManagement'
import StudentManagement from './pages/admin/StudentManagement'
import CoordinatorManagement from './pages/admin/CoordinatorManagement'
import MyProgress from './pages/student/MyProgress'
import ChangePassword from './pages/student/ChangePassword'
import ProjectLearning from './pages/student/ProjectLearning'
import GuidedLearningPage from './pages/student/GuidedLearningPage'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import StudentLayout from './components/layout/StudentLayout'
import CoordinatorLayout from './components/layout/CoordinatorLayout'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to={user?.role === 'admin' ? "/admin" : user?.role === 'coordinator' ? "/coordinator" : "/dashboard"} />} 
        />
        <Route 
          path="/dashboard" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <Dashboard />
              </StudentLayout>
            ) : (
              <Navigate to={user?.role === 'admin' ? "/admin" : "/coordinator"} />
            )
          }
        />
        <Route 
          path="/admin" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/admin/projects" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <ProjectsManagement />
              </AdminLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/admin/students" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <StudentManagement />
              </AdminLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/admin/coordinators" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <CoordinatorManagement />
              </AdminLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/coordinator" 
          element={
            user?.role === 'coordinator' ? (
              <CoordinatorLayout>
                <CoordinatorDashboard />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/project-learning" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <ProjectLearning />
              </StudentLayout>
            ) : user?.role === 'coordinator' ? (
              <CoordinatorLayout>
                <ProjectLearning />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/admin" />
            )
          }
        />
        <Route 
          path="/guided-learning/:projectId" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <GuidedLearningPage />
              </StudentLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route 
          path="/my-progress" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <MyProgress />
              </StudentLayout>
            ) : (
              <Navigate to="/admin" />
            )
          }
        />
        <Route 
          path="/change-password" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <ChangePassword />
              </StudentLayout>
            ) : user?.role === 'coordinator' ? (
              <CoordinatorLayout>
                <ChangePassword />
              </CoordinatorLayout>
            ) : user?.role === 'admin' ? (
              <AdminLayout>
                <ChangePassword />
              </AdminLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route 
          path="/" 
          element={<Navigate to={user ? (user?.role === 'admin' ? "/admin" : user?.role === 'coordinator' ? "/coordinator" : "/dashboard") : "/login"} />} 
        />
      </Routes>
    </div>
  )
}

export default App
