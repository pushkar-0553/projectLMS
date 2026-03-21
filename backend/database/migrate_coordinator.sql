-- Migration for Coordinator Approval Workflow
USE project_learning;

-- Add coordinator role to existing users if needed
UPDATE Users SET role = 'coordinator' WHERE email = 'admin@lms.com';

-- Create StudentProgress table for approval workflow
CREATE TABLE IF NOT EXISTS StudentProgress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  step_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewer_id INT NULL,
  feedback TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES Steps(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE SET NULL,
  INDEX idx_user_project (user_id, project_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_user_project_step (user_id, project_id, step_id)
);

-- Create ProjectSteps view for better step management
CREATE OR REPLACE VIEW ProjectSteps AS
SELECT 
  s.id,
  s.project_id,
  s.title,
  s.explanation,
  s.code_snippet,
  s.order_index,
  p.title as project_title,
  p.level,
  p.difficulty,
  p.estimated_time
FROM Steps s
JOIN Projects p ON s.project_id = p.id
ORDER BY s.project_id, s.order_index;

-- Create StudentProgressView for coordinator dashboard
CREATE OR REPLACE VIEW StudentProgressView AS
SELECT 
  sp.id,
  sp.user_id,
  u.name as student_name,
  u.email as student_email,
  sp.project_id,
  p.title as project_title,
  p.level,
  sp.step_id,
  s.title as step_title,
  sp.status,
  sp.submitted_at,
  sp.reviewed_at,
  sp.feedback,
  CASE 
    WHEN sp.status = 'pending' THEN 'Pending Approval'
    WHEN sp.status = 'approved' THEN 'Approved'
    WHEN sp.status = 'rejected' THEN 'Rejected - Needs Rework'
  END as status_display
FROM StudentProgress sp
JOIN Users u ON sp.user_id = u.id
JOIN Projects p ON sp.project_id = p.id
JOIN Steps s ON sp.step_id = s.id
ORDER BY sp.submitted_at DESC;

-- Insert sample coordinator if not exists
INSERT IGNORE INTO Users (name, email, password, role) 
VALUES ('Lab Coordinator', 'coordinator@lms.com', 'coordinator123', 'coordinator');

SELECT 'Coordinator approval workflow migration completed successfully!' as status;
