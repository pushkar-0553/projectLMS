-- Migration v6: Online class links for batches and sub-batches

ALTER TABLE Batches
ADD COLUMN IF NOT EXISTS class_link VARCHAR(1000) NULL;

ALTER TABLE SubBatches
ADD COLUMN IF NOT EXISTS class_link VARCHAR(1000) NULL;
