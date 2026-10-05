import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { courseAPI } from '../services/api';

const CourseContext = createContext(null);

export const CourseProvider = ({ children }) => {
  const { courseSlug: paramSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine slug from URL param, first path segment, or active localStorage
  const pathParts = location.pathname.split('/').filter(Boolean);
  const reserved = [
    'login', 'super-admin', 'resumes', 'public', 'users', 'admin',
    'coordinator', 'student', 'dashboard', 'my-progress', 'academic-progress',
    'project-learning', 'guided-learning', 'messages', 'notifications',
    'change-password', 'faculty'
  ];
  let resolvedSlug = paramSlug;
  if (!resolvedSlug && pathParts.length > 0 && !reserved.includes(pathParts[0])) {
    // If not a standard top-level page, first segment is course slug
    resolvedSlug = pathParts[0];
  }
  if (!resolvedSlug) {
    resolvedSlug = sessionStorage.getItem('activeCourseSlug') || localStorage.getItem('activeCourseSlug') || 'legacy';
  }

  const [currentCourse, setCurrentCourse] = useState(null);
  const [courseSlug, setCourseSlug] = useState(resolvedSlug);
  const [userRoleInCourse, setUserRoleInCourse] = useState(null);
  const [userCourses, setUserCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip course resolution on super-admin and public recruiter pages
    if (pathParts[0] === 'super-admin' || pathParts[0] === 'public' || location.pathname.startsWith('/resumes/share/')) {
      setLoading(false);
      return;
    }

    // If already loaded for this slug, avoid duplicate network roundtrip
    if (currentCourse && currentCourse.slug === resolvedSlug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCourseSlug(resolvedSlug);

    // Save active course slug in sessionStorage (isolated per tab)
    sessionStorage.setItem('activeCourseSlug', resolvedSlug);

    courseAPI.getBySlug(resolvedSlug)
      .then((res) => {
        if (!isMounted) return;
        if (res.data.success && res.data.course) {
          setCurrentCourse(res.data.course);
          setUserRoleInCourse(res.data.userRole);
          setUserCourses(res.data.userEnrollments || []);
          document.title = `${res.data.course.name} | Project LMS`;
        } else {
          setError(`Course '${resolvedSlug}' could not be resolved.`);
          setCurrentCourse(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load course context:', err);
        setError(err.response?.data?.message || `Course '${resolvedSlug}' not found.`);
        setCurrentCourse(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedSlug, pathParts[0]]);

  const switchCourse = (newSlug) => {
    if (!newSlug || newSlug === courseSlug) return;
    sessionStorage.setItem('activeCourseSlug', newSlug);
    // Replace current path segment with new slug
    const currentSubPath = location.pathname.replace(`/${courseSlug}`, '');
    const targetPath = currentSubPath ? `/${newSlug}${currentSubPath}` : `/${newSlug}/dashboard`;
    navigate(targetPath);
  };

  const value = {
    currentCourse,
    courseSlug,
    userRoleInCourse,
    userCourses,
    loading,
    error,
    switchCourse
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

export default CourseContext;
