# LMS Platform Project Overview

## 1. System Objective
This web application is a robust **Learning Management System (LMS)** specifically tailored for project-based learning. Instead of solely watching videos or reading textual documentation, students acquire knowledge by building "projects" structured sequentially through detailed, actionable steps. 

## 2. Core Architecture
The system is built on a modern MERN-like stack utilizing MySQL instead of MongoDB:
- **Frontend:** React.js (Bootstrapped with Vite), using React Router for navigation and `recharts` for data visualization. Context API is used for authentication states.
- **Backend:** Node.js with Express.js.
- **Database:** MySQL.
- **File Storage:** Local file system via `multer` (Uploads are stored in `/uploads/` for project thumbnails and step-by-step imagery).

## 3. Project Modes
The platform splits learning into two distinct methodologies depending on the project type:

### A. Simple Projects
- **Goal:** Fast, self-paced learning.
- **Flow:** The student opens the project and sees **all steps simultaneously** in a scrollable, accordion-style page. The student completes them independently at their own pace without needing external validation.

### B. Main Projects (Structured Learning)
- **Goal:** Rigorous, strictly-evaluated learning simulating a real lab environment.
- **Flow:** The student only sees **one step at a time**. After reading the instructions and examining the reference images, the student completes the task on their machine and clicks "Submit for Approval". They are locked out of the next step until a **Lab Coordinator** physically reviews their work and explicitly approves the step via the Coordinator Portal.

---

## 4. User Roles & Permissions

The application enforces Role-Based Access Control (RBAC) powered by JWT (JSON Web Tokens).

### 1. Admin
- **Role:** The highest authority governing the system's content and users.
- **Capabilities:**
  - Create, view, update, and delete **Projects**.
  - Upload project thumbnails and define detailed, multi-image **Steps** for projects.
  - Manage accounts for Students and Lab Coordinators (Create/Delete).
  - Access a modernized visual dashboard displaying platform-wide project statistics (Total Projects, Tier distribution, etc.).

### 2. Lab Coordinator
- **Role:** The evaluator and mentor.
- **Capabilities:**
  - View all enrolled students and their current progress across all projects.
  - Review "Pending Approvals" for **Main Projects**.
  - Provide constructive textual feedback and choose to **Approve** or **Reject** a student's step submission.
  - Access an analytics dashboard (featuring `recharts` Bar Charts) to monitor active student distribution across various projects.

### 3. Student
- **Role:** The end-user consuming the educational content.
- **Capabilities:**
  - Browse available projects (Simple & Main) via the `/project-learning` catalog.
  - Track their progress percentage visually.
  - Consume multi-step learning modules containing text explanations and image screenshots.
  - Submit steps for evaluation (if Main project) and read Coordinator feedback.

---

## 5. Key Frontend Directories

- `src/components/common/`: Reusable UI elements (Buttons, Cards, Modals, Progress Bars).
- `src/components/layout/`: Layout wrappers defining the sticky navigation sidebars tailored to each user role (`AdminLayout`, `CoordinatorLayout`, `StudentLayout`).
- `src/components/forms/`: Complex form handling, primarily the `ProjectUploadForm` which handles multi-part form data (including dynamic arrays of images for steps).
- `src/pages/`: Top-level navigational views, grouped by domain (`/admin`, `/coordinator`, `/student`, and `/learning`).
- `src/services/api.js`: The central Axios instance configuring base URLs, attaching JWT interceptors, and exporting modularized API wrappers (`projectAPI`, `coordinatorAPI`, etc.).

---

## 6. Key Backend Directories

- `controllers/`: Contains the core business logic (e.g. `coordinatorController` handles calculating complex SQL joins for the dashboard metrics).
- `models/`: Abstraction layer directly interfacing with the `mysql2/promise` connection pool. Handles CRUD logic.
- `routes/`: Express routers mapping REST endpoints to their respective controllers. Uses custom `authMiddleware` and `roleMiddleware` functions to shield sensitive endpoints.
- `database/`: Contains initialization and migration `.sql` scripts (e.g., `migrate_v3.sql` which adds the `images` JSON column to enable step-by-step image arrays).
- `uploads/`: The physical resting place for `multer` injected binary files, served statically via `express.static`.

---

## Note on "Project Liteness"
During recent refactoring, several deprecated components and heavy pages (like `RoadmapPage`, `ProjectPage`, `LearningPage`, `EnhancedLearningPage`, and the `CodeEditor` dependency) were completely scrubbed from the repository. The source code is now strictly tailored to the visual Guided Learning flow, resulting in a cleaner, more maintainable, and lightweight codebase suitable for immediate integration.
