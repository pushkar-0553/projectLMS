# 🛡️ Role-Based Access Control (RBAC) Matrix — Course Scope

**Date:** September 2026  
**Status:** Architecture Specification  
**Model:** Course-Scoped RBAC (Role + Course Scope + Resource)

---

## 1. Permission Hierarchy

```
Global Scope (Platform)
  └── Super Admin
        │
        └── Course Scope (Tenant)
              ├── Course Admin
              ├── Coordinator
              ├── Faculty
              └── Student
```

---

## 2. Comprehensive RBAC Matrix

| Resource / Action | Super Admin | Course Admin | Coordinator | Faculty | Student | Public |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Courses** | | | | | | |
| Create Course | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Course Details / Slug | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate / Activate Course | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Course Info | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Own) | ✅ (Own) | ✅ (Info) |
| **Course Memberships & Staff** | | | | | | |
| Assign Course Admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign Coordinators / Faculty | ✅ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ |
| Enroll / Drop Students | ✅ | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ❌ |
| **Batches & Sub-Batches** | | | | | | |
| Create Batches | ✅ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ |
| Create Sub-Batches | ✅ | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ❌ |
| View Batches | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ✅ (Enrolled) | ❌ |
| **Projects & Steps** | | | | | | |
| Create / Edit Projects | ✅ | ✅ (Own) | ❌ | ❌ | ❌ | ❌ |
| View Projects | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Own) | ✅ (Own) | ❌ |
| Approve Project Steps | ✅ | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ❌ |
| Work on Project Steps | ❌ | ❌ | ❌ | ❌ | ✅ (Enrolled) | ❌ |
| **Tasks & Submissions** | | | | | | |
| Create & Assign Tasks | ✅ | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ❌ |
| Submit Tasks | ❌ | ❌ | ❌ | ❌ | ✅ (Enrolled) | ❌ |
| Review / Grade Submissions | ✅ | ✅ (Own) | ✅ (Own) | ❌ | ❌ | ❌ |
| **Attendance & Academics** | | | | | | |
| Create Attendance Sessions | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ❌ | ❌ |
| Mark Attendance | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ❌ | ❌ |
| Schedule Assessments | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ❌ | ❌ |
| View Attendance / Results | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ✅ (Self) | ❌ |
| **Mock Interviews & Mentoring**| | | | | | |
| Schedule Mock Interview | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ❌ | ❌ |
| Submit Interview Evaluation | ✅ | ❌ | ❌ | ✅ (Assigned) | ❌ | ❌ |
| View Evaluation Feedback | ✅ | ✅ (Own) | ✅ (Own) | ✅ (Assigned) | ✅ (Self) | ❌ |
| **Resumes & Placements** | | | | | | |
| View / Manage Resume Hub | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload Student Resume | ✅ | ✅ | ✅ | ❌ | ✅ (Self) | ❌ |
| Public Recruiter Access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Token) |

*(Own) = Restricted strictly to the specific course context in which the user holds an active membership.*

---

## 3. Enforcement Rules

1. **Explicit Isolation Rule:** If a user possesses the role `coordinator` in `Course A`, their JWT authorizes coordinator endpoints *only when* accessing `Course A` resources. If they invoke an endpoint for `Course B`, the backend returns `403 Forbidden`.
2. **Super Admin Exemption:** The `super_admin` role operates platform-wide and bypasses individual course membership checks.
3. **Student Isolation:** Students cannot view projects, tasks, live sessions, or student rosters of courses they are not enrolled in.
