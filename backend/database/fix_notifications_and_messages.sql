-- Fix Notifications and Create Messages
-- 1. Notifications: Add sender_id and ensure columns match what frontend expects (or model)
ALTER TABLE Notifications ADD COLUMN sender_id INT NULL AFTER recipient_id;
ALTER TABLE Notifications ADD CONSTRAINT fk_notif_sender FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE SET NULL;

-- 2. Create Messages Table
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
  INDEX idx_messages_sender (sender_id),
  INDEX idx_messages_batch (batch_id),
  INDEX idx_messages_receiver (receiver_id)
);
