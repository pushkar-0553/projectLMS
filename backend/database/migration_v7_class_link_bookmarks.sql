-- Migration v7: Multiple online class link bookmarks

CREATE TABLE IF NOT EXISTS ClassLinks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    batch_id INT NULL,
    sub_batch_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
    FOREIGN KEY (sub_batch_id) REFERENCES SubBatches(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);
