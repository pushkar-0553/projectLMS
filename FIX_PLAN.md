# 🛠️ Examination Platform Fix Plan

This document defines the prioritized engineering plan to bring the Written Examination Platform to full production readiness under the target workload of **30 concurrent online candidates** within free-tier deployment constraints.

---

## Issue 1: Paper Update Overwrites Questions of Active Assignments (P0)
- **Severity:** P0 — Critical Data Integrity
- **Impact:** Modifying a question paper in the Studio deletes and re-inserts sections and questions on the current version. If this version is already assigned to a live or completed exam, historical student answers lose question associations, or questions are modified during an active test.
- **Root Cause:** `updatePaper` in `backend/services/paperService.js` directly executed `DELETE FROM exam_questions WHERE ...` on the current `paper_version_id` without checking if assignments are already bound to that version.
- **Recommended Fix:** 
  1. Check if `versionId` is already bound to any `exam_assignments`.
  2. If an assignment exists, branch into version incrementation: create a new version (`version_number + 1`), insert the updated sections and questions there, and leave the historical version intact.
  3. If no assignments are bound to the version, update in place.
- **Files Affected:** `backend/services/paperService.js`
- **Database Impact:** None (preserves existing versioning schema).
- **Testing Required:** Update an unassigned paper (updates in place); update a paper with existing assignments (creates version 2, leaves version 1 untouched).
- **Risk:** Low (enhances immutability).

---

## Issue 2: Evaluator Cannot View Student Code Answers (P0)
- **Severity:** P0 — Critical Functionality
- **Impact:** When an evaluator opens `EvaluationView` to grade a candidate's submission, student answers for coding questions appear as blank or `(No answer provided)` because code content is not retrieved.
- **Root Cause:** In `backend/services/evaluationService.js`, `getCandidateSubmissionForEvaluation` queries `SELECT question_id, answer_text, selected_option FROM exam_answers`, omitting `code_content` and `code_language`.
- **Recommended Fix:** 
  1. Add `code_content` and `code_language` to the SELECT query in `evaluationService.js`.
  2. Map `code_content` to `studentAnswer` and provide `codeLanguage` in the question payload.
  3. In `frontend/src/pages/exams/EvaluationView.jsx`, render a formatted code block with language badge when `codeContent` is present.
- **Files Affected:** 
  - `backend/services/evaluationService.js`
  - `frontend/src/pages/exams/EvaluationView.jsx`
- **Database Impact:** None.
- **Testing Required:** Complete an exam with a coding question; open Evaluation view; verify student code is rendered with syntax/monospace styling.
- **Risk:** Low.

---

## Issue 3: Missing Rate Limiting & Brute-Force Defense on OTP Verification (P1)
- **Severity:** P1 — High Security
- **Impact:** An attacker could automate 6-digit numeric OTP guesses against an examination code without triggering an IP or attempt lockout.
- **Root Cause:** `/api/exams/student-exam/verify-otp` had no rate limiting middleware, and `examSessionService.js` threw an error on mismatched OTP without incrementing attempt counts.
- **Recommended Fix:** 
  1. Create an `otpRateLimiter` middleware (max 10 verification requests per 15 minutes per IP) and attach it to `/student-exam/verify-otp`.
  2. Enforce strict input validation (assignment code format, 6-digit numeric OTP).
- **Files Affected:** 
  - `backend/routes/examRoutes.js`
  - `backend/services/examSessionService.js`
- **Database Impact:** None.
- **Testing Required:** Test rapid incorrect OTP requests; verify HTTP 429 response after threshold.
- **Risk:** Very low.

---

## Issue 4: Potential Race Condition on Double-Submission (P1)
- **Severity:** P1 — High Concurrency & Integrity
- **Impact:** If a candidate clicks "Submit" twice in rapid succession, or if network retry fires while an auto-submit is processing, duplicate audit events or inconsistent finalization states could occur.
- **Root Cause:** `submitExam` in `securityViolationService.js` performed a non-atomic check-then-act (`SELECT` followed by `UPDATE`).
- **Recommended Fix:** Use an atomic update query with status condition:
  `UPDATE exam_sessions SET status = 'SUBMITTED', submission_type = 'MANUAL', submitted_at = ? WHERE id = ? AND status = 'IN_PROGRESS'`.
  If `affectedRows === 0`, return success immediately without re-triggering audit logs or status mutations.
- **Files Affected:** `backend/services/securityViolationService.js`
- **Database Impact:** None.
- **Testing Required:** Trigger two simultaneous submit calls with the same token; ensure only one atomic transition occurs.
- **Risk:** None.

---

## Issue 5: Autosave Query Roundtrip Latency Under 30 Candidates (P1)
- **Severity:** P1 — High Performance
- **Impact:** In `answerSyncService.js`, syncing 5 answers requires 5 sequential `SELECT` queries and 5 sequential `UPDATE`/`INSERT` queries (10 network roundtrips to TiDB Cloud). Under 30 candidates, this creates up to 20 queries/second and artificial latency.
- **Root Cause:** Sequential single-row query loop instead of batch upsert.
- **Recommended Fix:** Leverage MySQL / TiDB `INSERT INTO exam_answers (...) VALUES (...) ON DUPLICATE KEY UPDATE` to sync all answers in a single batched database roundtrip.
- **Files Affected:** `backend/services/answerSyncService.js`
- **Database Impact:** Relies on existing `UNIQUE KEY (session_id, question_id)`.
- **Testing Required:** Sync multiple answers; verify database persistence and version conflict resolution.
- **Risk:** Low.

---

## Issue 6: Browser Refresh Recovery Without Re-entering Passcode (P2)
- **Severity:** P2 — Medium UX / Recoverability
- **Impact:** If a candidate accidentally reloads the browser tab during a live examination, the UI currently drops back to the initial OTP passcode entry prompt, which can induce candidate panic.
- **Root Cause:** `StudentExamPortal.jsx` did not check `sessionStorage` for an active `sessionToken` on component mount.
- **Recommended Fix:** Store the active `sessionToken` in `sessionStorage` for the active `assignmentCode`. On component mount, if a token exists, validate it and auto-restore the exam state smoothly.
- **Files Affected:** `frontend/src/pages/exams/StudentExamPortal.jsx`
- **Database Impact:** None.
- **Testing Required:** Start exam, refresh page; verify exam instantly resumes with timer intact.
- **Risk:** Low.

---

## Issue 7: Environment Variables Template (`.env.example`) (P2)
- **Severity:** P2 — Medium DevOps
- **Impact:** Deployers or new environments lack a reference configuration file with placeholder secrets.
- **Root Cause:** No `.env.example` in `backend/`.
- **Recommended Fix:** Create `backend/.env.example` with safe dummy placeholders.
- **Files Affected:** `backend/.env.example`
- **Database Impact:** None.
- **Testing Required:** Verify completeness of environment variables.
- **Risk:** None.

---

## Issue 8: Evaluator Code Formatting Display (P3)
- **Severity:** P3 — Low UI Polish
- **Impact:** Coding answers in `EvaluationView.jsx` should be styled cleanly in monospace blocks with syntax cues.
- **Root Cause:** Rendered as generic text.
- **Recommended Fix:** Add syntax/code block container with language tag and copy button in `EvaluationView.jsx`.
- **Files Affected:** `frontend/src/pages/exams/EvaluationView.jsx`
- **Database Impact:** None.
- **Risk:** None.
