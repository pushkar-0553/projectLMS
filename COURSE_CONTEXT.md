# 🌐 Course Context & Resolution Pipeline

**Date:** September 2026  
**Status:** Architecture Specification  
**Platform:** Project LMS (Course Context System)

---

## 1. Overview & Core Philosophy

The Course Context system guarantees that:
1. **The URL slug is the canonical front-of-house selector:**  
   Every course-scoped interaction begins with `/:courseSlug/*` (e.g. `/agentk/dashboard`, `/javafs/projects`).
2. **Backend is the ultimate authority:**  
   The frontend derives context from the URL for layout and state, but the backend verifies the course entity and the user's authorization on every single request.
3. **No cross-contamination:**  
   Stale state from Course A is completely flushed when navigating to Course B.

---

## 2. Backend Course Middleware Pipeline

Every course-scoped API route flows through two dedicated Express middleware functions:

```
Incoming Request
  │
  ├── 1. `protect` (JWT Verification) -> populates `req.user`
  │
  ├── 2. `resolveCourseContext` -> resolves course from `slug` or `header` -> populates `req.course`
  │
  └── 3. `authorizeCourseAccess(requiredRoles)` -> validates membership -> executes controller
```

### 2.1 `resolveCourseContext` Middleware
```javascript
// backend/middleware/courseMiddleware.js
const Course = require('../models/courseModel');

const resolveCourseContext = async (req, res, next) => {
  try {
    // 1. Check URL param (:courseSlug or :courseId)
    // 2. Fall back to X-Course-Slug header if calling nested API
    const slug = req.params.courseSlug || req.headers['x-course-slug'];
    const courseId = req.params.courseId;

    let course = null;
    if (slug) {
      course = await Course.findBySlug(slug);
    } else if (courseId) {
      course = await Course.findById(courseId);
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course '${slug || courseId}' not found.`
      });
    }

    if (course.status !== 'active' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `Course '${course.name}' is currently inactive.`
      });
    }

    // Attach verified course object to request
    req.course = course;
    req.courseId = course.id;
    next();
  } catch (error) {
    console.error('Course resolution error:', error);
    res.status(500).json({ message: 'Internal server error resolving course' });
  }
};
```

### 2.2 `authorizeCourseAccess` Middleware
```javascript
const CourseMembership = require('../models/courseMembershipModel');

const authorizeCourseAccess = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const course = req.course;

      // Platform Super Admin bypasses course-level restrictions
      if (user.role === 'super_admin') {
        return next();
      }

      // Check course membership table
      const membership = await CourseMembership.find(user.id, course.id);
      if (!membership || membership.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are not enrolled in ${course.name}.`
        });
      }

      // Check role within this specific course
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Role '${membership.role}' cannot perform this action.`
        });
      }

      req.courseMembership = membership;
      next();
    } catch (error) {
      console.error('Course authorization error:', error);
      res.status(500).json({ message: 'Internal server error authorizing course access' });
    }
  };
};
```

---

## 3. Frontend Course Context System (React 18)

### 3.1 CourseContext & Provider
Located at `frontend/src/context/CourseContext.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseAPI } from '../services/api';

const CourseContext = createContext(null);

export const CourseProvider = ({ children }) => {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const [currentCourse, setCurrentCourse] = useState(null);
  const [userEnrollments, setUserEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseSlug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Fetch public/authenticated course metadata by slug
    courseAPI.getBySlug(courseSlug)
      .then((res) => {
        if (isMounted) {
          setCurrentCourse(res.data.course);
          setUserEnrollments(res.data.userEnrollments || []);
          // Update document title dynamically
          document.title = `${res.data.course.name} | Project LMS`;
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Course not found');
          setCurrentCourse(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseSlug]);

  const value = {
    currentCourse,
    courseSlug,
    userEnrollments,
    loading,
    error,
    switchCourse: (newSlug) => navigate(`/${newSlug}/dashboard`),
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
```

---

## 4. Frontend Route Guards & Interceptors

### 4.1 CourseProtectedRoute
Wraps all course-scoped screens:
1. Validates that the course is loaded and active.
2. Checks that the current user has an active membership in the course.
3. Renders a fallback or redirects if unauthorized.

### 4.2 Axios Request Interceptor (`X-Course-Slug`)
```javascript
// frontend/src/services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Derive active courseSlug from current URL path
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const reservedWords = ['login', 'super-admin', 'resumes', 'public'];
  if (pathParts.length > 0 && !reservedWords.includes(pathParts[0])) {
    config.headers['X-Course-Slug'] = pathParts[0];
  }

  return config;
});
```
