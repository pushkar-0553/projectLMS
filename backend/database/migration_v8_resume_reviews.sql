-- Migration v8: Add candidate evaluation reviews to resume_collection_students
ALTER TABLE resume_collection_students 
ADD COLUMN review_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN review_comment TEXT NULL,
ADD COLUMN reviewed_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP;
