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

// Platform Components
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

import SuperAdminLayout from './components/layout/SuperAdminLayout'
import SuperAdminOverview from './pages/superadmin/SuperAdminOverview'
import SuperAdminCourses from './pages/superadmin/SuperAdminCourses'
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers'

import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import StudentLayout from './components/layout/StudentLayout'
import CoordinatorLayout from './components/layout/CoordinatorLayout'
import FacultyLayout from './components/layout/FacultyLayout'

// Role Helper Functions
const isAdminOrSuper = (user) => user?.role === 'admin' || user?.role === 'super_admin';
const isCoordinatorOrAbove = (user) => user?.role === 'coordinator' || user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'super_admin';
const isFacultyOrAbove = (user) => user?.role === 'faculty' || user?.role === 'coordinator' || user?.role === 'admin' || user?.role === 'super_admin';

const getRoleHomeRedirect = (user) => {
  if (!user) return '/login';
  if (user.role === 'super_admin') return '/super-admin/overview';

  const primarySlug = user.primaryCourse?.course_slug || user.courses?.[0]?.course_slug || localStorage.getItem('activeCourseSlug');
  const prefix = primarySlug ? `/${primarySlug}` : '';

  if (user.role === 'admin') return `${prefix}/admin`;
  if (user.role === 'coordinator') return `${prefix}/coordinator`;
  if (user.role === 'faculty') return `${prefix}/faculty`;
  return `${prefix}/dashboard`;
};

function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  React.useEffect(() => {
    let title = 'VCUBE LMS Platform';
    let isResumePage = false;
    const path = location.pathname;

    if (path === '/resumes' || path.endsWith('/resumes')) {
      title = 'Placement Resume Hub | VCUBE';
      isResumePage = true;
    } else if (path.startsWith('/resumes/share/')) {
      title = 'Shared Resumes | VCUBE';
      isResumePage = true;
    } else if (path === '/login') {
      title = 'Login | VCUBE LMS';
    } else if (path.includes('/dashboard')) {
      title = 'Dashboard | VCUBE LMS';
    } else if (path.includes('/admin')) {
      const parts = path.split('/admin');
      const sub = parts[1] ? parts[1].replace(/^\//, '') : '';
      if (!sub) {
        title = 'Admin Console | VCUBE LMS';
      } else {
        const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
        title = `${capitalized} - Admin | VCUBE LMS`;
      }
    } else if (path.includes('/coordinator')) {
      const parts = path.split('/coordinator');
      const sub = parts[1] ? parts[1].replace(/^\//, '') : '';
      if (!sub) {
        title = 'Coordinator Dashboard | VCUBE LMS';
      } else {
        const capitalized = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
        title = `${capitalized} - Coordinator | VCUBE LMS`;
      }
    } else if (path.includes('/student/')) {
      title = 'Student Portal | VCUBE LMS';
    } else if (path.includes('/faculty')) {
      title = 'Faculty Portal | VCUBE LMS';
    } else if (path.includes('/super-admin')) {
      title = 'Super Admin Console | VCUBE LMS';
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
        {/* Public & Recruiter Routes */}
        <Route path="/resumes" element={<ResumeDashboard />} />
        <Route path="/:courseSlug/resumes" element={<ResumeDashboard />} />
        <Route path="/resumes/share/:token" element={<ResumeSharePage />} />
        
        {/* Auth Route */}
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to={getRoleHomeRedirect(user)} replace />} 
        />

        {/* Super Admin Platform Routes */}
        <Route path="/super-admin" element={<Navigate to="/super-admin/overview" replace />} />
        <Route 
          path="/super-admin/overview" 
          element={
            user?.role === 'super_admin' ? (
              <SuperAdminLayout>
                <SuperAdminOverview />
              </SuperAdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/super-admin/courses" 
          element={
            user?.role === 'super_admin' ? (
              <SuperAdminLayout>
                <SuperAdminCourses />
              </SuperAdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/super-admin/users" 
          element={
            user?.role === 'super_admin' ? (
              <SuperAdminLayout>
                <SuperAdminUsers />
              </SuperAdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />

        {/* Default Student / Role Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user?.role === 'super_admin' ? (
              <Navigate to="/super-admin/overview" replace />
            ) : user?.role === 'admin' ? (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            ) : (user?.role === 'coordinator' || user?.role === 'faculty') ? (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            ) : (
              <StudentLayout>
                <Dashboard />
              </StudentLayout>
            )
          }
        />

        {/* ======================================================== */}
        {/* Global / Legacy Admin Routes                             */}
        {/* ======================================================== */}
        <Route 
          path="/admin" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/projects" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <ProjectsManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/students" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <StudentManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route
          path="/admin/student/:studentId"
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <StudentProfilePage />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/coordinators" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <CoordinatorManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/admin/faculties" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <FacultyManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/admin/batches" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <BatchManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/messages" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <MessagingPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/admin/users" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/history" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <SystemHistory />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/analytics" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/admin/sessions" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <SessionManager />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />

        {/* ======================================================== */}
        {/* Global / Legacy Coordinator Routes                       */}
        {/* ======================================================== */}
        <Route 
          path="/coordinator" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <CoordinatorDashboard />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/subbatches" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <SubBatchManagement />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/tasks" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <TaskManager />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/submissions/:taskId" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <SubmissionReview />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/history" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <ActivityHistory />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/academics" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AcademicOperations />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/attendance" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AttendancePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route 
          path="/coordinator/messages" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <MessagingPage />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/coordinator/student/:studentId"
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <StudentProfilePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route
          path="/coordinator/guidance"
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AcademicGuidance />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />
        <Route
          path="/coordinator/interviews"
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <MockInterview />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          }
        />

        {/* ======================================================== */}
        {/* Global / Legacy Faculty Routes                           */}
        {/* ======================================================== */}
        <Route 
          path="/faculty" 
          element={
            isFacultyOrAbove(user) ? (
              <FacultyLayout />
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
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

        {/* Shared User Profile Route */}
        <Route
          path="/users/profile"
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <StudentProfilePage />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <StudentProfilePage />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <StudentProfilePage />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Global Student Routes */}
        <Route 
          path="/project-learning" 
          element={
            user ? (
              <StudentLayout>
                <ProjectLearning />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/guided-learning/:projectId" 
          element={
            user ? (
              <StudentLayout>
                <GuidedLearningPage />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/my-progress" 
          element={
            user ? (
              <StudentLayout>
                <MyProgress />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/academic-progress" 
          element={
            user ? (
              <StudentLayout>
                <AcademicProgress />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/tasks" 
          element={
            user ? (
              <StudentLayout>
                <TaskList />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/messages" 
          element={
            user ? (
              <StudentLayout>
                <MessagingPage />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/task/:id" 
          element={
            user ? (
              <StudentLayout>
                <TaskSubmission />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/performance" 
          element={
            user ? (
              <StudentLayout>
                <StudentPerformance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/live-classroom" 
          element={
            user ? (
              <StudentLayout>
                <LiveClassroom />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/interviews" 
          element={
            user ? (
              <StudentLayout>
                <MockInterview />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/interview-guidance" 
          element={
            user ? (
              <StudentLayout>
                <InterviewGuidance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/student/attendance" 
          element={
            user ? (
              <StudentLayout>
                <MyAttendance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/notifications" 
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <NotificationCenter />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <NotificationCenter />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <NotificationCenter />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route 
          path="/change-password" 
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <ChangePassword />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <ChangePassword />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <ChangePassword />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ======================================================== */}
        {/* DYNAMIC COURSE-SCOPED ROUTES                             */}
        {/* ======================================================== */}
        <Route 
          path="/:courseSlug/login" 
          element={!user ? <Login /> : <Navigate to={getRoleHomeRedirect(user)} replace />} 
        />
        
        {/* Course root: Redirects to role default page */}
        <Route 
          path="/:courseSlug" 
          element={
            !user ? (
              <Navigate to="login" replace />
            ) : isAdminOrSuper(user) ? (
              <Navigate to="admin" replace />
            ) : isCoordinatorOrAbove(user) ? (
              <Navigate to="coordinator" replace />
            ) : (
              <Navigate to="dashboard" replace />
            )
          } 
        />

        {/* Course-Scoped Dashboard */}
        <Route 
          path="/:courseSlug/dashboard" 
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user?.role === 'student' ? (
              <StudentLayout>
                <Dashboard />
              </StudentLayout>
            ) : isAdminOrSuper(user) ? (
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            ) : isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <CoordinatorDashboard />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Course-Scoped Admin Sub-Routes */}
        <Route 
          path="/:courseSlug/admin" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/projects" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <ProjectsManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/students" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <StudentManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/student/:studentId" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <StudentProfilePage />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/coordinators" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <CoordinatorManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/faculties" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <FacultyManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/batches" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <BatchManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/messages" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <MessagingPage />
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/users" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <UserManagement />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/history" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <SystemHistory />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/analytics" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/admin/sessions" 
          element={
            isAdminOrSuper(user) ? (
              <AdminLayout>
                <SessionManager />
              </AdminLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />

        {/* Course-Scoped Coordinator Sub-Routes */}
        <Route 
          path="/:courseSlug/coordinator" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <CoordinatorDashboard />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/subbatches" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <SubBatchManagement />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/tasks" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <TaskManager />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/submissions/:taskId" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <SubmissionReview />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/history" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <ActivityHistory />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/academics" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AcademicOperations />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/attendance" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AttendancePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/messages" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <MessagingPage />
              </CoordinatorLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/student/:studentId" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <StudentProfilePage />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/guidance" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <AcademicGuidance />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/coordinator/interviews" 
          element={
            isCoordinatorOrAbove(user) ? (
              <CoordinatorLayout>
                <MockInterview />
              </CoordinatorLayout>
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
            )
          } 
        />

        {/* Course-Scoped Faculty Sub-Routes */}
        <Route 
          path="/:courseSlug/faculty" 
          element={
            isFacultyOrAbove(user) ? (
              <FacultyLayout />
            ) : (
              <Navigate to={getRoleHomeRedirect(user)} replace />
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

        {/* Course-Scoped Student & Shared Sub-Routes */}
        <Route 
          path="/:courseSlug/project-learning" 
          element={
            user ? (
              <StudentLayout>
                <ProjectLearning />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/guided-learning/:projectId" 
          element={
            user ? (
              <StudentLayout>
                <GuidedLearningPage />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/my-progress" 
          element={
            user ? (
              <StudentLayout>
                <MyProgress />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/academic-progress" 
          element={
            user ? (
              <StudentLayout>
                <AcademicProgress />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/tasks" 
          element={
            user ? (
              <StudentLayout>
                <TaskList />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/task/:id" 
          element={
            user ? (
              <StudentLayout>
                <TaskSubmission />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/performance" 
          element={
            user ? (
              <StudentLayout>
                <StudentPerformance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/live-classroom" 
          element={
            user ? (
              <StudentLayout>
                <LiveClassroom />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/interviews" 
          element={
            user ? (
              <StudentLayout>
                <MockInterview />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/interview-guidance" 
          element={
            user ? (
              <StudentLayout>
                <InterviewGuidance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/student/attendance" 
          element={
            user ? (
              <StudentLayout>
                <MyAttendance />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/messages" 
          element={
            user ? (
              <StudentLayout>
                <MessagingPage />
              </StudentLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/notifications" 
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <NotificationCenter />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <NotificationCenter />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <NotificationCenter />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/change-password" 
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <ChangePassword />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <ChangePassword />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <ChangePassword />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:courseSlug/users/profile" 
          element={
            user ? (
              isAdminOrSuper(user) ? (
                <AdminLayout>
                  <StudentProfilePage />
                </AdminLayout>
              ) : isCoordinatorOrAbove(user) ? (
                <CoordinatorLayout>
                  <StudentProfilePage />
                </CoordinatorLayout>
              ) : (
                <StudentLayout>
                  <StudentProfilePage />
                </StudentLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Default / Fallback Routes */}
        <Route 
          path="/" 
          element={<Navigate to={getRoleHomeRedirect(user)} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={getRoleHomeRedirect(user)} replace />} 
        />
      </Routes>
    </div>
  )
}

export default App
