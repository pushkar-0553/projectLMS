# 🎯 Target Architecture Blueprint — Course-Scoped Project LMS

**Date:** September 2026  
**Status:** Architecture Specification  
**Platform:** Project LMS (Multi-Course Transformation)

---

## 1. High-Level Architectural Vision

The target architecture transforms Project LMS from a single-curriculum silo into a **Multi-Course, Tenant-Aware, Course-Scoped Learning Management System** while maintaining:
* **One Single Codebase** (React 18 frontend + Node.js/Express backend)
* **One Common Database** (TiDB Cloud MySQL)
* **One Global User Directory** with dynamic **Course Memberships**
* **Zero Hardcoded Course Slugs or Names** in components or controllers
* **Data-driven Course Creation** through a dedicated **Super Admin** console

```
                                    PROJECT LMS
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
             SUPER ADMIN                               AUTH SYSTEM
           (Platform Level)                          (Users & JWT)
                    │                                         │
                    ▼                                         ▼
              COURSES ENGINE                           GLOBAL USERS
                    │                                         │
      ┌─────────────┼─────────────┐                           │
      ▼             ▼             ▼                           │
   Course A      Course B      Course N                       │
  (e.g. agentk)  (e.g. javafs)  (...)                         │
      │             │             │                           │
      └─────────────┴──────┬──────┘                           │
                           ▼                                  │
                 COURSE MEMBERSHIPS ◄─────────────────────────┘
                (Role, Batch, Status)
                           │
                           ▼
                 COURSE CONTEXT RESOLVER
               (URL Slug -> Course Entity)
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
    BATCHES             PROJECTS             STAFF
  (Course Scope)     (Course Scope)     (Course Scope)
       │                   │                   │
       ▼                   ▼                   ▼
  SUB-BATCHES        PROJECT STEPS       TASKS / SESSIONS
       │                                       │
       ▼                                       ▼
    STUDENTS                             SUBMISSIONS &
  (Enrollment)                            ATTENDANCE
       │                                       │
       └───────────────────┬───────────────────┘
                           ▼
                  PERFORMANCE MATRIX
                 (Course-Calibrated)
```

---

## 2. Framework Mapping Note (React vs Angular)

The specification requirements outline conceptual structures often titled with Angular terms (e.g. *Guards, Interceptors, CourseResolver*). In this project:
* The production codebase is **React 18 + Vite** with **React Router DOM v6.8**.
* Every single required architectural pattern maps directly and natively into React:
  * **Angular CourseResolver / ContextService** ➔ **React `CourseContext` & `CourseProvider` hook (`useCourse()`)**
  * **Angular Route Guards (`AuthGuard`, `CourseGuard`, `RoleGuard`)** ➔ **React Router `<CourseProtectedRoute>` & `<RoleRoute>` wrappers**
  * **Angular HTTP Interceptor** ➔ **Axios Request Interceptor (injecting `X-Course-Slug` and `Bearer token`)**
  * **Angular Dynamic Route Configuration** ➔ **React Router DOM `/:courseSlug/*` dynamic routing tree**

---

## 3. Super Admin vs Scoped Roles

| Level | Role | Scope | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Platform** | **Super Admin** | **Global (Platform-Wide)** | Course lifecycle (Create, Edit, Slug, Deactivate, Configure), assign Course Admins/Staff, platform audit logs, global analytics. Accessible at `/super-admin/*` (no course slug). |
| **Course** | **Admin** | **Assigned Course(s)** | Manage batches, assign coordinators and faculty, review course statistics and projects within their assigned course. Accessible at `/:courseSlug/admin/*`. |
| **Course** | **Coordinator** | **Assigned Course(s)** | Manage sub-batches, create course tasks, review student submissions, manage attendance, approve project steps. Accessible at `/:courseSlug/coordinator/*`. |
| **Course** | **Faculty** | **Assigned Course & Batches** | Conduct mock interviews, host live sessions, monitor academic progress, mentor students. Accessible at `/:courseSlug/faculty/*`. |
| **Course** | **Student** | **Enrolled Course(s)** | Follow project curriculum, submit tasks, attend live classes, view attendance and performance. Accessible at `/:courseSlug/student/*` or `/:courseSlug/dashboard`. |

---

## 4. URL Routing & Resolution Pipeline

### Dynamic Route Hierarchy
```
Public & Unauthenticated:
  /login                            --> Global login (redirects to enrolled course dashboard)
  /:courseSlug/login                --> Course-branded login portal
  /super-admin/login                --> Super admin login
  /resumes/share/:token             --> Public recruiter sharing (no course auth required)
  /public/resume/:token             --> Public individual resume preview

Platform Operations:
  /super-admin/dashboard            --> Super Admin console
  /super-admin/courses              --> Course Management (Create, Edit, Configure)
  /super-admin/users                --> Global User Management & Role Assignments

Course-Scoped Application:
  /:courseSlug/dashboard            --> Course home for Student / Staff
  /:courseSlug/projects/*           --> Course-scoped project learning
  /:courseSlug/tasks/*              --> Course-scoped tasks & submissions
  /:courseSlug/attendance/*         --> Course-scoped attendance records
  /:courseSlug/admin/*              --> Course Admin management
  /:courseSlug/coordinator/*        --> Coordinator operations
  /:courseSlug/faculty/*            --> Faculty mentorship operations
```

### Resolution Flow
```
Browser navigates to /:courseSlug/*
               │
               ▼
Extract courseSlug from URL params
               │
               ▼
CourseProvider verifies courseSlug against backend cache/API
               │
      ┌────────┴────────┐
      ▼                 ▼
Course Found?      Course Invalid / Deactivated?
      │                 │
      │                 ▼
      │             Render 404 / Course Inactive Page
      ▼
Check User Authentication (JWT)
      │
      ┌────────┴────────┐
      ▼                 ▼
Not Authenticated?  Authenticated?
      │                 │
      ▼                 ▼
Redirect to         Verify Course Membership
/:courseSlug/login  (user_id has active enrollment in course_id)
                        │
               ┌────────┴────────┐
               ▼                 ▼
         Member Active?     Not a Member?
               │                 │
               ▼                 ▼
         Render Course      Render 403 Forbidden /
           Interface        Course Switcher
```

---

## 5. Security & Isolation Invariants

1. **Dual Validation:** The frontend URL slug provides UI context; the backend `resolveCourseContext` middleware enforces query scoping and database isolation.
2. **Never Trust Frontend IDs:** Frontend request bodies cannot pass arbitrary `course_id` parameters to bypass course boundaries. The backend derives `course_id` strictly from the validated slug and checks `CourseMemberships`.
3. **Database-Level Scoping:** Every SQL query for course resources must explicitly include `WHERE course_id = ?` or join via `course_memberships` / `batches`.
4. **Course Deactivation Integrity:** When a course is marked `is_active = FALSE`, all `/courseSlug/*` routes reject non-Super-Admin requests immediately with `403 Course Inactive`. All historical student data and submissions remain preserved in the database.
5. **Public Route Segregation:** Recruiter resume links (`/resumes/share/:token`) and public file downloads are explicitly exempted from course context requirements.
