ALTER TABLE Notifications RENAME COLUMN recipient_id TO user_id;
ALTER TABLE Notifications RENAME COLUMN notification_type TO type;
ALTER TABLE Notifications RENAME COLUMN action_url TO link;

-- Ensure the enum matches the requirements exactly
ALTER TABLE Notifications MODIFY COLUMN type VARCHAR(50) NOT NULL;
