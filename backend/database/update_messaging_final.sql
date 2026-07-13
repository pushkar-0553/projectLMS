-- Final Polish for Messaging System
ALTER TABLE Messages
ADD COLUMN status VARCHAR(20) DEFAULT 'sent',
ADD COLUMN read_by JSON,
ADD COLUMN reactions JSON,
ADD COLUMN reply_to_id INT NULL;

ALTER TABLE Messages
ADD CONSTRAINT fk_messages_reply FOREIGN KEY (reply_to_id) REFERENCES Messages(id) ON DELETE SET NULL;
