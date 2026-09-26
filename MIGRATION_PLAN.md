# 🔄 Multi-Course Migration Plan — Project LMS

**Date:** September 2026  
**Status:** Execution Blueprint  
**Goal:** Zero data loss, zero regression migration from single-course to multi-course LMS.

---

## 1. Migration Overview & Non-Destructive Principles

1. **Zero Data Destruction:** No existing records, IDs, foreign keys, files, or progress will be dropped.
2. **Deterministic Baseline:** All existing 38 users, 8 batches, 1 project, tasks, and progress will be gracefully assigned to a foundational "Legacy / Main Full Stack" course (`slug: 'legacy'`, name: `Full Stack Development`).
3. **Phase-by-Phase Verification:** Each phase must pass specific validation assertions (record counts, isolation checks) before advancing.

---

## 2. Phase-by-Phase Execution Schedule

### Phase 1: Audit & Documentation (COMPLETED)
- [x] Complete codebase and database inspection.
- [x] Generate `CURRENT_ARCHITECTURE.md`.
- [x] Generate `TARGET_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `COURSE_CONTEXT.md`, `RBAC_MATRIX.md`, `API_CHANGES.md`, `MIGRATION_PLAN.md`.

### Phase 2: Database Foundation Migration
- [ ] Create `Courses`, `CourseMemberships`, `CourseModules` tables.
- [ ] Add `course_id` column to `Projects`, `Batches`, `Tasks`, `Assessments`, `LiveSessions`.
- [ ] Update `Users.role` to include `'super_admin'`.

### Phase 3: Legacy Data Backfill & Integrity Check
- [ ] Insert Default Course (`id: 1`, `name: 'Full Stack Development'`, `code: 'FS-DEV'`, `slug: 'legacy'`).
- [ ] Associate all existing 8 batches with Course 1: `UPDATE Batches SET course_id = 1 WHERE course_id IS NULL;`
- [ ] Associate existing project(s) with Course 1: `UPDATE Projects SET course_id = 1 WHERE course_id IS NULL;`
- [ ] Populate `CourseMemberships` for all 38 existing users based on their existing roles and batches.
- [ ] Run verification script to confirm exact counts:
  * Project count before == after (1)
  * Batch count before == after (8)
  * User count before == after (38)

### Phase 4: Backend Course Infrastructure
- [ ] Implement `courseModel.js` and `courseMembershipModel.js`.
- [ ] Implement `courseMiddleware.js` (`resolveCourseContext`, `authorizeCourseAccess`).
- [ ] Implement `courseRoutes.js` and `superAdminRoutes.js`.
- [ ] Refactor `projectController.js`, `batchModel.js`, and `taskModel.js` to scope queries by `course_id`.

### Phase 5: Frontend Course Context & Routing (React)
- [ ] Implement `CourseContext.jsx` and `useCourse()` hook.
- [ ] Configure Axios interceptor to send `X-Course-Slug`.
- [ ] Refactor `App.jsx` to mount dynamic `/:courseSlug/*` route structure.
- [ ] Implement `CourseProtectedRoute` and course switcher component for multi-enrolled students.

### Phase 6: Super Admin Management Console
- [ ] Build `/super-admin/courses` page with Course Creation modal (Name, Code, Slug, Duration, Description).
- [ ] Build Staff & Faculty assignment controls per course.
- [ ] Build Course Activation/Deactivation toggles.

### Phase 7: Verification & Security Testing
- [ ] Verify Course Isolation: User enrolled in Course A cannot access Course B APIs (`403 Forbidden`).
- [ ] Verify Course Slug Routing: `http://localhost:3000/legacy/dashboard` loads seamlessly.
- [ ] Verify Public Resumes: `http://localhost:3000/resumes/share/:token` loads without authentication.
- [ ] Verify Super Admin capability to create a new course (e.g. `slug: 'agentk'`) and instantly navigate to `http://localhost:3000/agentk/login`.
