-- ============================================================
-- Migration: Add Faculty role and Mock Interview system
-- ============================================================

-- Step 1: Add 'faculty' to the Users.role ENUM
-- MySQL requires redefining the full ENUM to add a value
ALTER TABLE Users
  MODIFY COLUMN role ENUM('student', 'admin', 'coordinator', 'faculty') DEFAULT 'student';

-- Step 2: Faculty profiles (specialisation, bio, assigned batches)
CREATE TABLE IF NOT EXISTS FacultyProfiles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL UNIQUE,
  specialisation VARCHAR(255),
  bio         TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Step 3: Mock interview sessions
--   faculty_id  → the faculty who conducts it
--   student_id  → the student being interviewed
--   status      → scheduled | live | completed | cancelled
CREATE TABLE IF NOT EXISTS MockInterviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id    INT NOT NULL,
  student_id    INT NOT NULL,
  title         VARCHAR(255) NOT NULL DEFAULT 'Mock Interview',
  scheduled_at  DATETIME NOT NULL,
  duration_mins INT DEFAULT 45,
  status        ENUM('scheduled', 'live', 'completed', 'cancelled') DEFAULT 'scheduled',
  room_id       VARCHAR(255),        -- video SDK room identifier (Agora / Daily.co)
  notes         TEXT,                -- faculty notes before the session
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id)  REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)  REFERENCES Users(id) ON DELETE CASCADE
);

-- Step 4: Evaluation scores recorded by faculty during/after interview
--   One row per interview — faculty fills this in real-time on the split panel
CREATE TABLE IF NOT EXISTS InterviewEvaluations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  interview_id        INT NOT NULL UNIQUE,
  communication_score TINYINT UNSIGNED DEFAULT 0,  -- 0-10
  technical_score     TINYINT UNSIGNED DEFAULT 0,  -- 0-10
  confidence_score    TINYINT UNSIGNED DEFAULT 0,  -- 0-10
  problem_solving     TINYINT UNSIGNED DEFAULT 0,  -- 0-10
  overall_score       TINYINT UNSIGNED DEFAULT 0,  -- auto-calculated average (0-10)
  strengths           TEXT,
  improvements        TEXT,
  final_remarks       TEXT,
  evaluated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES MockInterviews(id) ON DELETE CASCADE
);

-- Step 5: Mentoring sessions (lighter than interviews — check-ins, career chats)
CREATE TABLE IF NOT EXISTS MentoringSessions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id   INT NOT NULL,
  student_id   INT NOT NULL,
  topic        VARCHAR(255),
  session_date DATE NOT NULL,
  duration_mins INT DEFAULT 30,
  summary      TEXT,
  action_items TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id)  REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)  REFERENCES Users(id) ON DELETE CASCADE
);

-- Useful indexes for dashboard queries
CREATE INDEX idx_interviews_faculty   ON MockInterviews(faculty_id);
CREATE INDEX idx_interviews_student   ON MockInterviews(student_id);
CREATE INDEX idx_interviews_status    ON MockInterviews(status);
CREATE INDEX idx_mentoring_faculty    ON MentoringSessions(faculty_id);
CREATE INDEX idx_mentoring_student    ON MentoringSessions(student_id);
