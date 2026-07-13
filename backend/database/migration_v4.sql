-- Migration v4: Batch Management and Audit Logs

CREATE TABLE IF NOT EXISTS Batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS SubBatches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS StudentBatchMap (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    batch_id INT,
    sub_batch_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (sub_batch_id) REFERENCES SubBatches(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_batch (user_id, batch_id)
);

CREATE TABLE IF NOT EXISTS Tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(255),
    created_by INT NOT NULL,
    assigned_type ENUM('batch', 'subbatch', 'student') NOT NULL,
    deadline DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TaskAssignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    batch_id INT,
    sub_batch_id INT,
    student_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
    FOREIGN KEY (sub_batch_id) REFERENCES SubBatches(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_text TEXT,
    file_path VARCHAR(255),
    status ENUM('submitted', 'approved', 'rejected') DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewer_id INT,
    feedback TEXT,
    FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ActivityLogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('admin', 'coordinator') NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type ENUM('batch', 'subbatch', 'task', 'submission', 'user') NOT NULL,
    entity_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
