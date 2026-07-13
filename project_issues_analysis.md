# 🔍 Project Issues Analysis — By User Role

After a deep code audit of every controller, route, model, middleware, and frontend page, here are all the problems I found, organized by role.

---

## 🔴 CRITICAL — Cross-Cutting Issues (Affect ALL Roles)

### 1. 🔓 Password Leaked in Login Response
**File:** [authController.js:59-76](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/authController.js#L59-L76)

`User.findByEmail()` returns `SELECT *` — which includes the **hashed password**. The login response sends the **full user object** (including `password`) back to the client.

```js
// Line 65: user object includes password hash
const user = await User.findByEmail(email);
// Line 75: sent directly to frontend
res.json({ token, user }); // ❌ user.password is exposed!
```

> [!CAUTION]
> The password hash is sent to the browser on every login. This is a **security vulnerability**.

### 2. 🔓 Open Registration Endpoint — Anyone Can Create Any Role
**File:** [authRoutes.js:6](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/authRoutes.js#L6)

The `/api/auth/register` endpoint is **publicly accessible** (no auth required) and accepts a `role` parameter:

```js
// authController.js line 21
const { name, email, password, role = 'student' } = req.body;
```

> [!CAUTION]
> Anyone can call `POST /api/auth/register` with `role: 'admin'` and create an admin account. There is **zero protection** on this endpoint.

### 3. 🔓 JWT Role Stored in Token is Never Re-validated
**File:** [token.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/utils/token.js#L3-L6)

The role is embedded in the JWT at login time. If an admin changes a user's role, the old token still carries the **original role** until it expires (7 days!). The `authMiddleware.js` `protect` function trusts the token's role directly.

### 4. 🔄 Duplicate/Conflicting User.create() Signatures
**File:** [userModel.js:4](file:///c:/Users/kagit/Desktop/Project%20task/backend/models/userModel.js#L4)

The model's `create()` accepts an **object** `{ name, email, password, role, mobile, batch }`, but `authController.register()` calls it with **positional args**: `User.create(name, email, hashedPassword, role)`. This will **crash** because the model expects destructuring.

```js
// authController.js (positional call — WRONG)
const userId = await User.create(name, email, hashedPassword, role);

// userModel.js (expects object destructuring)
static async create({ name, email, password, role, mobile, batch }) { ... }
```

> [!WARNING]
> The registration endpoint is likely **broken** due to this mismatch.

### 5. 📊 Database Schema vs Actual Queries Mismatch
The `platform_schema.sql` defines tables like `Users` with columns `username, first_name, last_name, password_hash` — but all controllers/models use `name, password` columns. This means:
- The codebase runs on a **different, evolved schema** from what's documented in `platform_schema.sql`
- There are **25 migration files** but no single source-of-truth for the current schema

### 6. ⚡ No Input Sanitization or SQL Injection Protection Beyond Parameterized Queries
While parameterized queries are used (good), there's **no input validation** library (e.g., Joi, express-validator). Raw user input flows directly into business logic.

### 7. 🌐 CORS is Wide Open
**File:** [server.js:29](file:///c:/Users/kagit/Desktop/Project%20task/backend/server.js#L29) and [socket/index.js:8-9](file:///c:/Users/kagit/Desktop/Project%20task/backend/socket/index.js#L8-L9)

```js
app.use(cors());           // Allows ALL origins
cors: { origin: "*" }      // Socket.io also allows ALL origins
```

---

## 👑 Admin Role Issues

### 8. 🔓 No Route for Deleting Users in Admin Routes
**File:** [adminRoutes.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/adminRoutes.js)

The admin routes file has **no delete user route**, but the frontend calls `api.delete('/admin/users/${id}')` via [api.js:131](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/services/api.js#L131). The delete endpoint **does not exist** — it will return 404.

### 9. 🔓 No Bulk Create Route in Admin Routes
**File:** [adminRoutes.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/adminRoutes.js)

The frontend calls `api.post('/admin/bulk-create-students', { students })` ([api.js:132](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/services/api.js#L132)) but there's **no matching route** defined in `adminRoutes.js`. This feature is completely broken.

### 10. ❌ Admin Cannot Send Manual Notifications
**File:** [notificationController.js:65](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/notificationController.js#L65)

```js
if (senderRole !== 'coordinator' && senderRole !== 'faculty') {
  return res.status(403).json({ error: 'Only coordinators and faculty...' });
}
```
Admin is explicitly **blocked** from sending manual notifications, even though they have the UI for it.

### 11. 🔀 Admin Dashboard Stats Use `DUAL` Subqueries Without Scoping
**File:** [coordinatorController.js:224-231](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/coordinatorController.js#L224-L231)

The coordinator's dashboard stats count **ALL students globally**, not scoped to the coordinator's batches:
```sql
SELECT (SELECT COUNT(*) FROM Users WHERE role = 'student') as total_students
```
This leaks cross-coordinator data.

### 12. ❌ Creating a Notification Has No Role Check
**File:** [notificationRoutes.js:12](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/notificationRoutes.js#L12)

`POST /api/notifications/` allows **any authenticated user** (including students) to create notifications for **any other user**. There's no role check on `createNotification`.

---

## 🧑‍💼 Coordinator Role Issues

### 13. ⚠️ Coordinator Sees ALL Pending Approvals Globally
**File:** [coordinatorController.js:240-256](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/coordinatorController.js#L240-L256)

`getPendingApprovals()` fetches **ALL** pending student progress globally with `WHERE sp.status = 'pending'` — it does **not** filter by the coordinator's batches. A coordinator can see and approve steps from students in **other coordinators' batches**.

### 14. ⚠️ Coordinator Can Approve/Reject ANY Student's Step
**File:** [coordinatorController.js:298-347](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/coordinatorController.js#L298-L347)

`approveStep()` and `rejectStep()` only check `progressId` — they don't verify the student belongs to the coordinator's batch. **Any coordinator can approve/reject any student's work**.

### 15. ⚠️ getProjectStats Uses Non-Existent Tables
**File:** [coordinatorController.js:260-278](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/coordinatorController.js#L260-L278)

The query references `Progress` table (`SELECT user_id, project_id FROM Progress`) which may not exist in the current schema. The actual schema uses `StepProgress` and `StudentProgress`.

### 16. ❌ Task Assignment Has No Ownership Verification
**File:** [coordinatorController.js:127-152](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/coordinatorController.js#L127-L152)

When assigning a task, there's no check that:
- The task was created by this coordinator
- The target student belongs to this coordinator's batch
- The batch/sub-batch belongs to this coordinator

### 17. ❌ Faculty Has Full Coordinator Access
**File:** [roleMiddleware.js:32](file:///c:/Users/kagit/Desktop/Project%20task/backend/middleware/roleMiddleware.js#L32)

```js
const isCoordinator = requireRole(['coordinator', 'faculty']);
```
Faculty users have **identical access** to all coordinator routes, including sub-batch management, task creation, and student approval — which likely shouldn't be the case.

---

## 👨‍🏫 Faculty Role Issues

### 18. 🎲 Performance Metrics Use Random Numbers
**File:** [facultyController.js:117-127](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L117-L127)

```js
const responseVelocity = Math.min(100, (data.total_evaluations * 10) + 70);
const studentSatisfaction = 4.5 + (Math.random() * 0.5);
res.json({
  accuracy: 95 + (Math.random() * 4),  // ❌ RANDOM fake data!
  velocity: responseVelocity,
  satisfaction: studentSatisfaction.toFixed(1), // ❌ RANDOM
});
```

> [!WARNING]
> Faculty performance dashboard shows **fabricated/random** data. `accuracy` and `satisfaction` are generated with `Math.random()`, meaning they change on every API call.

### 19. ⚠️ getMyBatches Returns ALL Batches (Not Faculty's)
**File:** [facultyController.js:6-26](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L6-L26)

Despite having `facultyId = req.user.id`, the query has **no WHERE clause** filtering by faculty. It returns **every batch** in the system:
```sql
SELECT b.*, ... FROM Batches b LEFT JOIN Users u ON b.coordinator_id = u.id
-- NO WHERE clause filtering by faculty!
```

### 20. ⚠️ getInterviews Returns ALL Interviews (Not Faculty's)
**File:** [facultyController.js:258-273](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L258-L273)

Same issue — fetches **all interviews across all faculty** with no `WHERE faculty_id = ?` filter.

### 21. ⚠️ getMentoringSessions Returns ALL Sessions
**File:** [facultyController.js:394-409](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L394-L409)

No filtering by faculty ID. Returns **all mentoring sessions globally**.

### 22. ⚠️ getMyNotes Returns ALL Notes (Not Faculty's Own)
**File:** [facultyController.js:168-183](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L168-L183)

The query has no `WHERE fn.faculty_id = ?` filter — it returns **all notes from all faculty**.

### 23. 🗺️ Evaluation Maps `improvements` to Both `weaknesses` AND `recommendations`
**File:** [facultyController.js:346-348](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/facultyController.js#L346-L348)

```js
strengths,
improvements,      // maps to weaknesses column
improvements,      // ALSO maps to recommendations column (duplicate!)
final_remarks
```
The `recommendations` field is never sent from the frontend — both DB columns get the same `improvements` value.

---

## 🎓 Student Role Issues

### 24. 🔓 No Role Check on Student Routes
**File:** [studentRoutes.js](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/studentRoutes.js)

Student routes only use `authenticateToken` — there's **no role check**. Any authenticated user (admin, coordinator, faculty) can call student-specific endpoints like `/student/my-tasks` and get results for their own ID.

### 25. ❌ Login Redirects ALL Roles to /dashboard
**File:** [Login.jsx:33-34](file:///c:/Users/kagit/Desktop/Project%20task/frontend/src/pages/Login.jsx#L33-L34)

After successful login, the Login page **always navigates to `/dashboard`** regardless of role:
```js
if (result.success) {
  navigate('/dashboard')  // ❌ Doesn't consider role!
}
```
But `/dashboard` is only for students. Admin/coordinator/faculty get **redirected again** by the route guard, causing a flash/double redirect.

### 26. ⚠️ Task Submission Has No File Upload Support
**File:** [studentController.js:32-48](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/studentController.js#L32-L48)

The `submitTask` accepts `file_path` from `req.body`, but there's **no Multer middleware** on the student routes. File uploads are not supported — students can only submit text.

### 27. ⚠️ getTaskDetail Has No Ownership Check
**File:** [studentController.js:16-30](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/studentController.js#L16-L30)

Any authenticated user can view **any task** by ID, regardless of whether it was assigned to them.

### 28. ❌ Student Can View ANY Other User's Conversation
**File:** [messageRoutes.js:13](file:///c:/Users/kagit/Desktop/Project%20task/backend/routes/messageRoutes.js#L13)

`GET /messages/conversation/:userId` only requires authentication. There's no check that the requested conversation involves the requesting user. A student could potentially access **any user's conversation** by guessing user IDs.

---

## 💬 Messaging System Issues (All Roles)

### 29. ⚠️ Socket.io Rooms for Batches Are Never Joined
**File:** [socket/index.js:25-38](file:///c:/Users/kagit/Desktop/Project%20task/backend/socket/index.js#L25-L38)

When a message is sent to a batch, the server emits to `batch:${batchId}`:
```js
io.to(`batch:${batch_id}`).emit('new_message', newMessage);
```
But in the socket initialization, users only join `user:${id}` and `role:${role}` rooms — **never `batch:${batchId}`**. Batch messages are emitted to rooms that **nobody is in**.

> [!IMPORTANT]
> Real-time batch announcements **do not work** because batch rooms are never joined.

### 30. ⚠️ Any User Can Pin/Unpin/React to ANY Message
**File:** [messageController.js:163-207](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/messageController.js#L163-L207)

No ownership check — any authenticated user can pin or react to messages they don't own or are not part of.

### 31. ⚠️ req.user.name Used But Never Set in JWT
**File:** [messageController.js:45](file:///c:/Users/kagit/Desktop/Project%20task/backend/controllers/messageController.js#L45)

```js
sender_name: req.user.name  // ❌ JWT only contains { id, role }
```
The JWT token only stores `id` and `role` (see [token.js:4](file:///c:/Users/kagit/Desktop/Project%20task/backend/utils/token.js#L4)). `req.user.name` is **always undefined**.

---

## 📊 Summary Table

| Severity | Category | Count |
|----------|----------|-------|
| 🔴 **Critical Security** | Password leak, open registration, no role checks | 5 |
| 🔴 **Broken Features** | Missing routes, schema mismatches, broken registration | 4 |
| 🟠 **Data Leaks / Wrong Scoping** | Global queries instead of scoped-to-user | 7 |
| 🟠 **Logic Bugs** | Random data, duplicate mappings, no batch rooms | 5 |
| 🟡 **Missing Validations** | No ownership checks, no input validation | 6 |
| 🟡 **Architecture** | Wide-open CORS, no schema source-of-truth | 4 |
| **Total** | | **31** |

---

## 🏆 Top 5 Fixes to Prioritize

| # | Fix | Impact |
|---|-----|--------|
| 1 | **Remove password from login response** — strip `password` field before sending `user` object | Security critical |
| 2 | **Remove or protect `/api/auth/register`** — either disable it or restrict role to `student` only | Security critical |
| 3 | **Fix `User.create()` call signature** in `authController.register()` — use object destructuring | Registration is broken |
| 4 | **Add batch-scoping** to coordinator's `getPendingApprovals()` and `approveStep()` | Data isolation |
| 5 | **Add batch room joining** in Socket.io initialization | Real-time messaging broken |

---

> [!NOTE]
> Despite these issues, the project has a solid architectural foundation — clean separation of concerns, proper JWT auth flow, parameterized SQL queries, and a well-structured React frontend. Most fixes are scoping/validation additions rather than fundamental rewrites.
