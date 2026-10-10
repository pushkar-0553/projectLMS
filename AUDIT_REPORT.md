# 📋 Written Examination Platform — Comprehensive Master Audit Report
**Project:** LMS Written Examination Module  
**Auditor:** Senior Product, Security, & System Architect  
**Audit Date:** October 2026  
**Target Workload:** Minimum 30 Concurrent Examination Candidates  
**Deployment Constraints:** Vercel Free Tier (Frontend), Render Free Tier (Backend), TiDB Cloud Stage DB (MySQL 8.0-compatible distributed PostgreSQL/MySQL tier)

---

## 1. Executive Summary

### 1.1 Current Architecture & Technology Stack
- **Frontend:** React 19 SPA with Vite 8, React Router v7, Lucide Icons, Monaco Editor (`@monaco-editor/react`), and custom CSS design system. Deployed to Vercel (static CDN edge).
- **Backend:** Node.js v22 with Express 4, Socket.io, Helmet, Compression, Rate-limiting, Nodemailer, Cloudinary, and native cryptographic APIs. Deployed to Render free-tier web service.
- **Database:** TiDB Cloud MySQL 8.0-compatible distributed database via `mysql2/promise` with connection pooling (`connectionLimit: 15`).
- **Data Persistence:** Multi-tiered architecture:
  - Layer 1: Client React State (instant UI feedback)
  - Layer 2: Client IndexedDB (`ExamVault_OfflineDB` via `indexedDbService`, durable local device storage)
  - Layer 3: Server Relational DB (`exam_answers`, `exam_sessions`, `exam_assignment_candidates`)
- **Exam Tools:** Monaco code editor (multi-language syntax/formatting), DuckDuckGo + Wikipedia technical search proxy with in-exam secure Reader View, and multi-model AI assistant with conceptual guardrails.
- **Email Engine:** Multi-account SMTP with connection pooling, automatic port fallback (465 SSL ↔ 587 STARTTLS), HTTPS API fallback (Resend/Brevo/SendGrid), exponential backoff, and open tracking.

### 1.2 System Evaluation

| Dimension | Evaluation | Notes |
| :--- | :--- | :--- |
| **Answer Persistence** | **HIGH** | React state + IndexedDB instant write + debounced server sync guarantees zero data loss on network drops. |
| **Exam Integrity** | **HIGH** | Fullscreen detection, window blur, visibility change, copy/cut/paste interception, max 3 violations auto-submission. |
| **Timer Authority** | **HIGH** | Server-authoritative (`started_at`, `expected_end_at`). Client clock alterations cannot manipulate remaining time. |
| **30-Candidate Concurrency** | **NEEDS IMPROVEMENT** | Autosave currently uses sequential `SELECT` + `INSERT`/`UPDATE` per question, which causes high database roundtrip latency under load. Batch upsert (`ON DUPLICATE KEY UPDATE`) is required. |
| **Data Integrity (Paper Updates)** | **RISKY** | `updatePaper` in-place deletes questions on the active version. If an exam is already in progress, editing mutates active questions. Must enforce immutable version incrementing for assigned papers. |
| **Evaluation Experience** | **NEEDS IMPROVEMENT** | `evaluationService.js` omits `code_content` from SQL queries, preventing evaluators from viewing code answers written by students. |
| **OTP Security** | **RISKY** | `/student-exam/verify-otp` has no rate limiting and does not increment failure attempts on invalid attempts, leaving it vulnerable to brute-force attacks. |
| **Submission Concurrency** | **RISKY** | `submitExam` lacks atomic status transition checks, allowing potential race conditions if double-clicked simultaneously. |

### 1.3 Overall System Rating
```
OVERALL RATING: NEEDS IMPROVEMENT
(Will reach PRODUCTION READY upon execution of FIX_PLAN.md)
```

---

## 2. Complete System Architecture Audit

### 2.1 Architecture Diagram
```
                     +--------------------------------------------------+
                     |                 Vercel Edge CDN                  |
                     |             React 19 SPA (Static Bundle)         |
                     +--------------------------------------------------+
                                              |
                   HTTPS (JSON API)           |  Session Token / JWT
                                              v
                     +--------------------------------------------------+
                     |             Render Free-Tier Backend             |
                     |         Express 4 + Helmet + Compression         |
                     |         Email Queue Worker (Connection Pool)     |
                     +--------------------------------------------------+
                             /            |            \          \
                            /             |             \          \
                           v              v              v          v
                  +-------------+  +-------------+  +--------+  +--------+
                  | TiDB Cloud  |  | SMTP Servers|  | AI API |  | Search |
                  | MySQL / DB  |  |  (Gmail /   |  | Open-  |  | Duck-  |
                  | Connection  |  |  Outlook /  |  | router |  | DuckGo |
                  |   Pool      |  |  Brevo)     |  | Gemini |  | Wiki   |
                  +-------------+  +-------------+  +--------+  +--------+
```

### 2.2 Potential Single Points of Failure & Bottlenecks
1. **Render Free-Tier Spin-Down:** If inactive for 15 minutes, Render sleeps. Cold start is ~45–50s. While taking an exam, candidate autosave heartbeats keep the server continuously warm, but initial login before an exam may encounter cold-start latency.
2. **TiDB Cloud Free-Tier Connection Ceiling:** Limited to 50 concurrent connections. Backend pool is configured to 15, preventing pool exhaustion.
3. **Autosave Database Roundtrips:** When candidates sync 5 questions at once, executing 5 sequential `SELECT` and 5 `UPDATE` calls causes 10 roundtrips per student. For 30 students, this creates unnecessary database latency.

---

## 3. Database Audit & Schema Inspection

### 3.1 Existing Tables Reused from LMS Core
The examination system does **NOT** duplicate student or user tables; it directly integrates with existing Stage DB structures:
- `Users`: Primary user table (`id`, `name`, `email`, `role`, `is_active`).
- `Batches`: Batch groupings (`id`, `name`, `course_id`, `start_date`, `end_date`).
- `StudentBatchMap`: Student-to-batch enrollment (`batch_id`, `student_id`, `assigned_at`).
- `Courses`: Curriculum tracks (`id`, `name`, `code`, `slug`).

### 3.2 Exam-Specific Tables & Isolation
- `exam_papers`: Master question papers (`id`, `title`, `duration_minutes`, `total_marks`, `status`).
- `exam_paper_versions`: Immutable version snapshots (`id`, `paper_id`, `version_number`, `content_snapshot_json`, `is_published`).
- `exam_sections`: Paper sections with capability defaults (`id`, `paper_version_id`, `default_capabilities`).
- `exam_questions`: Questions with capability overrides and marks (`id`, `section_id`, `capabilities_override`, `answer_key`).
- `exam_assignments`: Exam run instances bound to a paper version and batch (`id`, `assignment_code`, `paper_version_id`, `batch_id`).
- `exam_assignment_candidates`: Student-level examination snapshots (`id`, `assignment_id`, `student_id`, `snapshot_student_name`, `status`).
- `exam_otps`: Cryptographic passcodes (`id`, `candidate_id`, `otp_hash`, `otp_salt`, `encrypted_otp`, `expires_at`, `attempt_count`).
- `exam_sessions`: Active candidate exam sessions (`id`, `session_token`, `started_at`, `expected_end_at`, `status`, `violation_count`).
- `exam_answers`: Autosaved answers (`id`, `session_id`, `question_id`, `answer_text`, `code_content`, `code_language`, `version`).
- `exam_security_violations`: Proctoring violation events (`id`, `session_id`, `violation_type`, `recorded_at`).
- `exam_evaluations`: Evaluator scores per question (`candidate_id`, `question_id`, `marks_awarded`, `feedback`).
- `exam_results`: Final computed grades (`candidate_id`, `total_marks_awarded`, `percentage`, `is_passed`, `status`).
- `smtp_accounts`: Multi-account SMTP configuration (`id`, `sender_email`, `encrypted_password`, `daily_quota`, `sent_today`).
- `email_jobs`: Asynchronous delivery queue (`id`, `candidate_id`, `status`, `attempt_count`, `scheduled_for`).

---

## 4. 30-Concurrent-Candidate Workload & Capacity Analysis

### 4.1 Workload Calculation (30 Simultaneous Candidates)
- **Exam Duration:** 60 minutes
- **Typing / Autosave Cadence:** Debounced 2.5 seconds pause, periodic flush every 15 seconds.
- **Estimated Autosave Requests:**
  - Average syncs per candidate: ~4 syncs per minute
  - Total autosave requests: 30 candidates × 4 syncs/min = **120 requests/minute = 2.0 req/sec**
- **Payload Size:** ~1.2 KB per autosave batch
- **Bandwidth Consumption:** 2.0 req/sec × 1.2 KB = **2.4 KB/sec** (Negligible network load)
- **Database Query Volume:**
  - *Current Implementation:* 5 questions × 2 queries = 10 queries per sync = **20 queries/sec**.
  - *Optimized (Batch Upsert):* 1 query per sync = **2 queries/sec**.
- **Connection Pool Utilization:**
  - At 2 queries/sec with ~30ms execution time, average active connections = **0.06 connections**.
  - Peak concurrency during submission spike: **~3–5 connections**.
  - Configured `connectionLimit: 15` provides **300% safety buffer**.

---

## 5. Security & Vulnerability Audit

### 5.1 Broken Access Control & IDOR
- **Exam Administration:** Protected by `protect` and `authorize('admin', 'coordinator', 'super_admin', 'faculty')`.
- **Student Exam Operations:** Protected by unguessable 64-character hex `session_token` generated via `crypto.randomBytes(32)`. Candidate identity is derived strictly from the verified session token in the database.
- **Student Portal:** `GET /student/my-exams` derives student ID from verified JWT (`req.user.id`), preventing cross-student access.

### 5.2 OTP Passcode Brute-Force Vulnerability (Identified Finding)
- **Issue:** `/student-exam/verify-otp` has no rate limiting. When an OTP is incorrect, `attempt_count` is not incremented on the candidate record.
- **Risk:** An attacker could brute-force 6-digit numeric passcodes (1,000,000 combinations) against an active `assignment_code`.
- **Fix:** Add express-rate-limit middleware (max 10 attempts per 15 minutes per IP) and track failed attempts.

### 5.3 Double-Submission Race Condition (Identified Finding)
- **Issue:** `submitExam` checks `session.status`, then executes `UPDATE exam_sessions SET status = 'SUBMITTED'`. Two simultaneous submit requests could both pass the initial check.
- **Fix:** Atomic update with status guard: `UPDATE exam_sessions SET status = 'SUBMITTED' WHERE id = ? AND status = 'IN_PROGRESS'`.

---

## 6. Exam Integrity & Anti-Cheating Technical Controls

### 6.1 Browser-Enforced Controls
1. **Fullscreen Enforcement:** Requests fullscreen on exam start; exits are detected and logged as security violations.
2. **Window Blur & Tab Switching:** Listens to `window.blur` and `document.visibilitychange`.
3. **Clipboard Interception:** Intercepts `copy`, `cut`, and `paste` events.
4. **DevTools / Print Prevention:** Intercepts `F12`, `Ctrl+Shift+I`, `Ctrl+P`, `Ctrl+S`, and right-click context menu.
5. **Violation Penalty:** Recorded server-side; upon 3 violations, the exam is automatically locked and submitted with `submission_type = 'VIOLATION'`.

### 6.2 Inherent Limitations of Browser Proctoring
- Browser JavaScript cannot prevent external physical devices (mobile phones, secondary monitors, cameras).
- Operating system level shortcuts (Windows key, Alt+Tab, OS screenshot tools) cannot be completely disabled by a web browser.
- *Full details documented in `SECURITY_LIMITATIONS.md`.*

---

## 7. Audit Findings & Prioritization (P0–P3)

| ID | Priority | Category | Finding Description |
| :--- | :--- | :--- | :--- |
| **F-01** | **P0** | **Data Integrity** | `updatePaper` in `paperService.js` deletes sections and questions in-place on the active version. If an exam was already scheduled or conducted, questions could be altered. Must create a new version when updating papers that have active assignments. |
| **F-02** | **P0** | **Evaluation** | `evaluationService.js` omits `code_content` and `code_language` in `getCandidateSubmissionForEvaluation`, causing student coding answers to appear blank during grading. |
| **F-03** | **P1** | **Security** | `/student-exam/verify-otp` lacks rate limiting, making 6-digit OTPs susceptible to brute-force attempts. |
| **F-04** | **P1** | **Concurrency** | `submitExam` and `recordViolation` lack atomic status transitions, creating potential race conditions if multiple submission requests fire simultaneously. |
| **F-05** | **P1** | **Performance** | `answerSyncService.js` runs individual `SELECT` + `INSERT`/`UPDATE` per question instead of batch `ON DUPLICATE KEY UPDATE`, causing 10x unnecessary database roundtrips. |
| **F-06** | **P2** | **UX / Recovery** | Accidental browser refresh boots student back to the OTP entry screen instead of auto-restoring active session from local storage. |
| **F-07** | **P2** | **DevOps / Secrets** | Missing `.env.example` template with sanitized placeholders for production deployment reference. |
| **F-08** | **P3** | **UI Polish** | `EvaluationView.jsx` displays coding answers as plain text instead of formatted monospace code blocks with language tags. |
