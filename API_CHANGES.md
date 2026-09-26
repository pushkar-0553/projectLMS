# 🔌 API Changes Specification — Multi-Course Endpoints

**Date:** September 2026  
**Status:** API Specification  
**Architecture:** RESTful Course-Scoped & Platform Endpoints

---

## 1. New Course Management APIs (`/api/courses`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | Authenticated / Public | List all active courses (or all courses for Super Admin). |
| `GET` | `/api/courses/slug/:slug` | Public / Context | Resolve course details by slug for frontend routing. |
| `GET` | `/api/courses/:id` | Authenticated | Get full course details by ID. |
| `POST` | `/api/courses` | Super Admin | Create a new course (name, code, slug, duration, etc.). |
| `PUT` | `/api/courses/:id` | Super Admin | Update course metadata, status, or settings. |
| `DELETE` | `/api/courses/:id` | Super Admin | Deactivate course (soft toggle `status = 'inactive'`). |
| `GET` | `/api/courses/:id/members` | Course Admin / Super Admin | List staff and students enrolled in this course. |
| `POST` | `/api/courses/:id/members` | Course Admin / Super Admin | Assign a staff member or enroll a student in this course. |
| `DELETE` | `/api/courses/:id/members/:userId` | Course Admin / Super Admin | Remove or drop a user from this course. |

---

## 2. Refactored Course-Scoped Domain APIs

To ensure strict data isolation and eliminate cross-course data leaks, endpoints are refactored to require either a `:courseId` route parameter or the `X-Course-Slug` header.

### 2.1 Projects
* **Legacy:** `GET /api/projects` (Returned all projects in the entire database).
* **Target:** `GET /api/courses/:courseId/projects` or `GET /api/projects` with `X-Course-Slug: <slug>` header.
* **Payload Changes:** `POST /api/projects` now requires `course_id` (or automatically derives it from the course context).

### 2.2 Batches
* **Legacy:** `GET /api/admin/batches` (Returned all batches in the database).
* **Target:** `GET /api/courses/:courseId/batches`
* **Payload Changes:** `POST /api/admin/create-batch` includes `course_id`.

### 2.3 Tasks
* **Legacy:** `GET /api/coordinator/my-tasks`, `GET /api/student/my-tasks`
* **Target:** Filtered strictly by the student's or coordinator's active `course_id`.

### 2.4 Attendance & Academics
* **Legacy:** `GET /api/attendance/sessions`
* **Target:** Scoped to batches belonging to `course_id`.

### 2.5 Resumes & Public Sharing (Preserved)
* `GET /api/resumes/share/:token` (Public recruiter link) — **NO CHANGES**, remains globally accessible without course authentication.
* `GET /api/public/resumes/download/:token` — **NO CHANGES**.

---

## 3. Super Admin Platform APIs (`/api/super-admin`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/super-admin/overview` | Super Admin | Platform-wide totals (Total Courses, Students, Batches, Activity). |
| `GET` | `/api/super-admin/users` | Super Admin | Global user directory across all courses. |
| `POST` | `/api/super-admin/users` | Super Admin | Create global user and optionally assign course memberships. |
| `GET` | `/api/super-admin/audit-logs` | Super Admin | Global platform audit trail. |
