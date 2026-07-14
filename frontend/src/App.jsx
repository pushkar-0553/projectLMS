import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import favicon1 from './assets/favicon1.png'
import favicon from './assets/favicon.png'
import AdminDashboard from './pages/AdminDashboard'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import ProjectsManagement from './pages/admin/ProjectsManagement'
import StudentManagement from './pages/admin/StudentManagement'
import CoordinatorManagement from './pages/admin/CoordinatorManagement'
import FacultyManagement from './pages/admin/FacultyManagement'
import MyProgress from './pages/student/MyProgress'
import ChangePassword from './pages/student/ChangePassword'
import ProjectLearning from './pages/student/ProjectLearning'
import GuidedLearningPage from './pages/student/GuidedLearningPage'
import InterviewGuidance from './pages/student/InterviewGuidance'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import BatchManagement from './pages/admin/BatchManagement'
import UserManagement from './pages/admin/UserManagement'
import SystemHistory from './pages/admin/SystemHistory'
import SubBatchManagement from './pages/coordinator/SubBatchManagement'
import TaskManager from './pages/coordinator/TaskManager'
import SubmissionReview from './pages/coordinator/SubmissionReview'
import ActivityHistory from './pages/coordinator/ActivityHistory'
import AcademicOperations from './pages/coordinator/AcademicOperations'
import AttendancePage from './pages/coordinator/AttendancePage'
import MyAttendance from './pages/student/MyAttendance'
import TaskList from './pages/student/TaskList'
import TaskSubmission from './pages/student/TaskSubmission'
import AcademicProgress from './pages/student/AcademicProgress'
import StudentProfilePage from './pages/shared/StudentProfilePage'

// New Platform Components
import LiveClassroom from './pages/platform/LiveClassroom'
import MockInterview from './pages/platform/MockInterview'
import StudentPerformance from './pages/platform/StudentPerformance'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import AcademicGuidance from './pages/faculty/AcademicGuidance'
import StudentMonitoring from './pages/faculty/StudentMonitoring'
import ProjectManager from './pages/platform/ProjectManager'
import SessionManager from './pages/platform/SessionManager'
import NotificationCenter from './pages/platform/NotificationCenter'
import MessagingPage from './pages/MessagingPage'
import FacultyProjects from './pages/faculty/FacultyProjects'
import FacultySessions from './pages/faculty/FacultySessions'
import FacultyPerformance from './pages/faculty/FacultyPerformance'
import ResumeDashboard from './pages/resumes/ResumeDashboard'
import ResumeSharePage from './pages/resumes/ResumeSharePage'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import StudentLayout from './components/layout/StudentLayout'
import CoordinatorLayout from './components/layout/CoordinatorLayout'
import FacultyLayout from './components/layout/FacultyLayout'

function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  React.useEffect(() => {
    let title = 'VCUBE LMS Platform';
    let isResumePage = false;
    const path = location.pathname;

    if (path === '/resumes') {
      title = 'Placement Resume Hub | VCUBE';
      isResumePage = true;
    } else if (path.startsWith('/resumes/share/')) {
      title = 'Shared Resumes | VCUBE';
      isResumePage = true;
    } else if (path === '/login') {
      title = 'Login | VCUBE LMS';
    } else if (path === '/dashboard') {
      title = 'Dashboard | VCUBE LMS';
    } else if (path.startsWith('/admin')) {
      const sub = path.replace('/admin', '').replace(/^\//, '');
      if (!sub) {
        title = 'Admin Console | VCUBE LMS';
      } else {
        const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
        title = `${capitalized} - Admin | VCUBE LMS`;
      }
    } else if (path.startsWith('/coordinator')) {
      const sub = path.replace('/coordinator', '').replace(/^\//, '');
      if (!sub) {
        title = 'Coordinator Dashboard | VCUBE LMS';
      } else {
        const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
        title = `${capitalized} - Coordinator | VCUBE LMS`;
      }
    } else if (path.startsWith('/student/')) {
      const sub = path.replace('/student/', '');
      const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
      title = `${capitalized} - Student | VCUBE LMS`;
    } else if (path.startsWith('/faculty')) {
      const sub = path.replace('/faculty', '').replace(/^\//, '');
      if (!sub) {
        title = 'Faculty Dashboard | VCUBE LMS';
      } else {
        const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
        title = `${capitalized} - Faculty | VCUBE LMS`;
      }
    } else if (path === '/users/profile') {
      title = 'My Profile | VCUBE LMS';
    }

    document.title = title;

    // Dynamically update favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = isResumePage ? favicon : favicon1;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [location]);

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
        <Route path="/resumes" element={<ResumeDashboard />} />
        <Route path="/resumes/share/:token" element={<ResumeSharePage />} />
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to={
            user?.role === 'admin' ? "/admin" : 
            (user?.role === 'coordinator' || user?.role === 'faculty') ? "/coordinator" : 
            "/dashboard"
          } />} 
        />
        <Route 
          path="/dashboard" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <Dashboard />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : 
                  user?.role === 'admin' ? "/admin" : 
                  (user?.role === 'coordinator' || user?.role === 'faculty') ? "/coordinator" : 
                  "/dashboard"
                } />
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
              <Navigate to={!user ? "/login" : "/dashboard"} />
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
              <Navigate to={!user ? "/login" : "/dashboard"} />
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
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route
          path="/admin/student/:studentId"
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <StudentProfilePage />
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
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          } 
        />
        <Route 
          path="/admin/faculties" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <FacultyManagement />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          } 
        />
        <Route 
          path="/admin/batches" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <BatchManagement />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/admin/messages" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <MessagingPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route 
          path="/admin/users" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/admin/history" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <SystemHistory />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/admin/analytics" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />

        <Route 
          path="/admin/sessions" 
          element={
            user?.role === 'admin' ? (
              <AdminLayout>
                <SessionManager />
              </AdminLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />

        <Route 
          path="/faculty" 
          element={
            (user?.role === 'faculty' || user?.role === 'coordinator' || user?.role === 'admin') ? (
              <FacultyLayout />
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        >
          <Route index element={<FacultyDashboard />} />
          <Route path="messages" element={<MessagingPage />} />
          <Route path="guidance" element={<AcademicGuidance />} />
          <Route path="student-monitoring" element={<StudentMonitoring />} />
          <Route path="student/:studentId" element={<StudentProfilePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="progress/:studentId" element={<AcademicOperations />} />
          <Route path="projects" element={<FacultyProjects />} />
          <Route path="interviews" element={<MockInterview />} />
          <Route path="sessions" element={<FacultySessions />} />
          <Route path="performance" element={<FacultyPerformance />} />
          <Route path="history" element={<ActivityHistory />} />
        </Route>
        <Route 
          path="/coordinator" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <CoordinatorDashboard />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/subbatches" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <SubBatchManagement />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/tasks" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <TaskManager />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/submissions/:taskId" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <SubmissionReview />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/history" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <ActivityHistory />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/academics" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <AcademicOperations />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/attendance" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <AttendancePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/coordinator/messages" 
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <MessagingPage />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/coordinator/student/:studentId"
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <StudentProfilePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/users/profile"
          element={
            user ? (
              user?.role === 'admin' ? (
                <AdminLayout>
                  <StudentProfilePage />
                </AdminLayout>
              ) : (user?.role === 'coordinator' || user?.role === 'faculty') ? (
                <CoordinatorLayout>
                  <StudentProfilePage />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <StudentProfilePage />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/coordinator/guidance"
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <AcademicGuidance />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route
          path="/coordinator/interviews"
          element={
            (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <CoordinatorLayout>
                <MockInterview />
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
              <Navigate to={!user ? "/login" : "/admin"} />
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
              <Navigate to={!user ? "/login" : "/dashboard"} />
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
              <Navigate to={!user ? "/login" : "/admin"} />
            )
          }
        />
        <Route 
          path="/academic-progress" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <AcademicProgress />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/tasks" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <TaskList />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/messages" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <MessagingPage />
              </StudentLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route 
          path="/student/task/:id" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <TaskSubmission />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/performance" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <StudentPerformance />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/live-classroom" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <LiveClassroom />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/interviews" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <MockInterview />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/interview-guidance" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <InterviewGuidance />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/student/attendance" 
          element={
            user?.role === 'student' ? (
              <StudentLayout>
                <MyAttendance />
              </StudentLayout>
            ) : (
              <Navigate to={!user ? "/login" : "/dashboard"} />
            )
          }
        />
        <Route 
          path="/notifications" 
          element={
            user ? (
              user?.role === 'admin' ? (
                <AdminLayout>
                  <NotificationCenter />
                </AdminLayout>
              ) : user?.role === 'coordinator' ? (
                <CoordinatorLayout>
                  <NotificationCenter />
                </CoordinatorLayout>
              ) : user?.role === 'faculty' ? (
                <FacultyLayout>
                  <NotificationCenter />
                </FacultyLayout>
              ) : (
                <StudentLayout>
                  <NotificationCenter />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" />
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
          element={<Navigate to={user ? (
            user?.role === 'admin' ? "/admin" : 
            (user?.role === 'coordinator' || user?.role === 'faculty') ? "/coordinator" : 
            "/dashboard"
          ) : "/login"} />} 
        />
      </Routes>
    </div>
  )
}

export default App
