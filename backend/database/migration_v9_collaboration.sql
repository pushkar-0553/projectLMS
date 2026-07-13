-- ============================================================
-- Migration: Collaboration & Messaging System
-- ============================================================

-- 1. Messaging Table
CREATE TABLE IF NOT EXISTS Messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sender_id       INT NOT NULL,
  receiver_id     INT NULL,
  batch_id        INT NULL,
  sub_batch_id    INT NULL,
  content         TEXT NOT NULL,
  is_announcement BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)    REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id)  REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)     REFERENCES Batches(id) ON DELETE CASCADE,
  INDEX idx_messages_sender (sender_id),
  INDEX idx_messages_batch (batch_id),
  INDEX idx_messages_receiver (receiver_id)
);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        ENUM('task_assigned', 'submission_status', 'announcement', 'meeting', 'general') DEFAULT 'general',
  is_read     BOOLEAN DEFAULT FALSE,
  link        VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (is_read)
);

-- 3. Faculty Batch Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS FacultyBatchMap (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id  INT NOT NULL,
  batch_id    INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)   REFERENCES Batches(id) ON DELETE CASCADE,
  UNIQUE KEY (faculty_id, batch_id)
);

-- 4. Faculty Academic Content / Notes
CREATE TABLE IF NOT EXISTS FacultyNotes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id      INT NOT NULL,
  batch_id        INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  content         TEXT NOT NULL,
  reference_links JSON,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id)   REFERENCES Batches(id) ON DELETE CASCADE,
  INDEX idx_notes_batch (batch_id)
);
