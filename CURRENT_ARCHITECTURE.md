# 🏛️ Current Architecture Audit — Project LMS

**Date:** September 2026  
**Status:** Complete Audit (Phase 1)  
**Platform:** Project LMS (Student Execution & Mentorship Platform)  

---

## 1. Executive Overview

Project LMS is currently structured as a monolithic single-course LMS. The system assumes a single implicit learning track across the database, backend business logic, and frontend presentation. 

### Technology Stack Summary
* **Frontend:** React 18.2.0, Vite 4.1.0, React Router DOM 6.8.1, Axios 1.3.4, Recharts, Lucide React, Socket.io-client.
* **Backend:** Node.js 16+, Express 4.18.2, MySQL2 3.22.1 (TiDB Cloud Serverless on AWS), JWT, Bcryptjs, Multer, Cloudinary SDK, Socket.io 4.8.1.
* **Database:** TiDB Cloud MySQL-compatible database (`test` database), 41 active tables, 38 existing users, 8 batches, 1 initial project.

---

## 2. Frontend Structure Audit

* **Entry Point:** [App.jsx](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/App.jsx)
* **Auth State:** [AuthContext.jsx](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/context/AuthContext.jsx)
* **API Layer:** [api.js](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/services/api.js), `platformAPI.js`, `facultyAPI.js`, `socketService.js`
* **Layouts:**
  * `AdminLayout` — Admin navigation (Users, Batches, Coordinators, Faculty, Projects, Analytics, History).
  * `CoordinatorLayout` — Coordinator navigation (Dashboard, Sub-batches, Tasks, Approvals, Attendance, Academics).
  * `FacultyLayout` — Faculty navigation (Dashboard, Student Monitoring, Mock Interviews, Mentoring Sessions).
  * `StudentLayout` — Student navigation (Dashboard, Project Learning, Tasks, Attendance, Academics, Profile).
  * `Layout` — Generic base shell.

### Frontend Limitation: Single-Track Hardcoding
1. **Flat URL Routing:** Routes are globally defined without course parameters:
   * `/dashboard` (Student home)
   * `/projects` (Flat list of all projects)
   * `/admin/*`, `/coordinator/*`, `/faculty/*`
2. **Global Project Progress:** [ProjectLearning.jsx](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/pages/student/ProjectLearning.jsx) calls `projectAPI.getAll()`, assuming all projects belong to the student's curriculum.
3. **No Course Context Provider:** The frontend maintains `AuthContext` (User) and `SocketContext` (Realtime), but has zero concept of `CourseContext` or active course slug resolution.

---

## 3. Backend Structure Audit

### Entry & Middleware
* **Server:** [server.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/server.js) mounts 15 route modules under `/api/*`.
* **Auth Middleware:** [authMiddleware.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/middleware/authMiddleware.js) (`protect`, `authorize`).
* **RBAC Middleware:** [roles.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/middleware/roles.js) (`requireRole`, `requireOwnership`, `requireBatchAccess`, `requireSessionAccess`, `requireProjectAccess`).

### Existing API Route Modules (15 Total)
1. `/api/auth` — Login, register, user profile
2. `/api/projects` — CRUD projects, steps, resume learning
3. `/api/users` — User management, profile
4. `/api/admin` — User creation, batch creation, history
5. `/api/coordinator` — Sub-batches, tasks, step approvals
6. `/api/faculty` — Mock interviews, student monitoring, mentoring
7. `/api/student` — Task submissions, student activity
8. `/api/progress` — Step completion and tracking
9. `/api/academics` — Class links, assessments
10. `/api/platform` — Live sessions, interview evaluations, performance
11. `/api/attendance` — Attendance sessions & records
12. `/api/messages` — Direct & batch messages
13. `/api/notifications` — Notification center
14. `/api/resumes` — Resume hub, collections, evaluations
15. `/api/public/resumes` — Public recruiter token access

---

## 4. Database Structure & Live Tables Audit

The live TiDB database contains **41 tables**. Here is how domain entities are currently modeled:

```
[Users]
  │── (Directly has 'batch' column & 'role' enum)
  ├── StudentBatchMap (student_id -> batch_id, sub_batch_id)
  └── FacultyBatchMap (faculty_id -> batch_id)

[Batches]
  │── id, name, coordinator_id, faculty_id, class_link, start_date, end_date
  └── SubBatches (batch_id, name, created_by, class_link)

[Projects]
  │── id, title, level, type, trainer, duration, difficulty, order_index
  └── Steps / ProjectSteps (project_id, step_order, title, code_snippet, expected_output)

[Progress / StepProgress / StudentProgress]
  └── Track user_id + project_id / step_id

[Tasks]
  └── id, title, description, assigned_type ('batch','subbatch','student')
      └── Submissions (task_id, student_id, status, feedback)

[AttendanceSessions]
  └── id, title, session_date, batch_id, sub_batch_id, created_by
      └── AttendanceRecords (session_id, student_id, status)

[Assessments]
  └── id, title, assessment_type, assessment_date, max_marks
      └── AssessmentResults (assessment_id, student_id, marks_obtained, status)

[LiveSessions]
  └── id, title, session_type, host_id, batch_id, student_id
      ├── SessionParticipants
      └── InterviewEvaluations
```

---

## 5. Course-Dependent Modules Audit

Every core LMS module currently operates under single-course assumptions:

| Module | Current State | Missing Course Relationship |
| :--- | :--- | :--- |
| **Projects & Steps** | Global table `Projects` filtered only by level (1–5) and type (`main`/`simple`). | No `course_id`. All projects in DB display to all users. |
| **Batches & Sub-Batches** | `Batches` have no stream or track identifier. | No `course_id`. Cannot distinguish a "Java Batch" from a "GenAI Batch". |
| **User Enrollments** | `Users` table has a legacy `batch` text column and `StudentBatchMap`. | No `CourseEnrollments` or `CourseMemberships`. User is tied to a single batch without course scope. |
| **Tasks & Submissions** | `Tasks.assigned_type` targets a batch, sub-batch, or individual student. | No course scope. Coordinators can assign tasks across any batch. |
| **Attendance & Academics** | `AttendanceSessions` targets `batch_id`. Assessments are global. | Assessments and syllabus have no `course_id`. |
| **Mock Interviews & Mentoring** | `LiveSessions` targets `batch_id`. | No course link for interview criteria or topics. |
| **Analytics & History** | Aggregates all batches and users together. | No per-course performance matrix or course-scoped reporting. |
| **Resumes & Placements** | `student_resumes` and `resume_collections`. | Collections have a `company_name` and `jd`, but students are drawn from a single global pool. |

---

## 6. Authentication & RBAC Flow Audit

### Authentication Flow
1. User submits email/password to `POST /api/auth/login`.
2. Backend verifies bcrypt hash in `Users` table and signs JWT with payload: `{ id: user.id, role: user.role }`.
3. Client stores JWT in `localStorage('token')` and attaches it via Axios interceptor: `Authorization: Bearer <token>`.
4. On protected routes, `protect` middleware decodes token and re-verifies user from DB.

### RBAC Flow
* Roles: `['student', 'admin', 'coordinator', 'faculty']` (Stored directly on `Users.role`).
* Authorization is evaluated as: `authorize('admin', 'coordinator')`.
* **Critical RBAC Flaw:** Permissions are purely role-based without scope. A coordinator has coordinator permissions across *all* batches in the platform unless explicitly restricted by `Batches.coordinator_id`.

---

## 7. Tables Requiring Course Relationships

| Table Name | Action Required | Details |
| :--- | :--- | :--- |
| **Courses** *(New)* | Create | Primary course domain entity (`id`, `name`, `code`, `slug`, `status`, `duration`, etc.) |
| **CourseMemberships / Enrollments** *(New)* | Create | Multi-course mapping for students, faculty, coordinators, and admins (`user_id`, `course_id`, `role`, `batch_id`, `status`) |
| **Projects** | Add Column | `course_id INT NOT NULL` (Foreign Key to `Courses.id`) |
| **Batches** | Add Column | `course_id INT NOT NULL` (Foreign Key to `Courses.id`) |
| **Assessments** | Add Column | `course_id INT NULL` (Foreign Key to `Courses.id`) |
| **Tasks** | Add Column | `course_id INT NULL` (Foreign Key to `Courses.id` for direct indexing and fast isolation) |
| **LiveSessions** | Add Column | `course_id INT NULL` (Foreign Key to `Courses.id` for course-scoped classroom & mock interviews) |
| **StudentPerformance** | Add Column | `course_id INT NULL` (To support course-isolated performance matrices) |

---

## 8. Potential Migration Risks & Mitigation Strategies

1. **Breaking Existing Live Data:**
   * *Risk:* Adding `NOT NULL` foreign keys to `Projects` or `Batches` will fail if there is existing data without course IDs.
   * *Mitigation:* Create a default "Legacy Full Stack Course" (slug: `legacy` or `main`) first. Seed its record, backfill `course_id` on all existing records, and only then apply `NOT NULL` and foreign key constraints.
2. **Student & Staff Access Interruption:**
   * *Risk:* If route URLs immediately require `/:courseSlug/*`, existing bookmarks or logins (`/dashboard`, `/login`) could break.
   * *Mitigation:* Support automatic redirection: if an authenticated user accesses `/login` or `/dashboard`, resolve their enrolled course and redirect seamlessly to `/:courseSlug/dashboard`.
3. **Public Resume Token Exposure:**
   * *Risk:* Tying routes to course slugs might inadvertently block `/resume/:token` or `/resumes/share/:token`.
   * *Mitigation:* Explicitly whitelist public resume endpoints at top-level routes outside course slug resolution.
4. **TI-DB / MySQL Connection Concurrency:**
   * *Risk:* Complex joins across legacy mapping tables and new course tables could cause performance degradation.
   * *Mitigation:* Direct `course_id` indexing on frequently queried domain tables (`Projects`, `Batches`, `CourseMemberships`).
