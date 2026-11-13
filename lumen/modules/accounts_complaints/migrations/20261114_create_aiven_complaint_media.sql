-- Add complaint image storage directly to Aiven MySQL.
-- Run after the accounts/complaints base schema and citizen-role migration.
-- Image bytes are stored in MySQL; there is no Supabase/object-storage column.

CREATE TABLE IF NOT EXISTS complaint_media (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id      BIGINT UNSIGNED NOT NULL,
  uploaded_by       BIGINT UNSIGNED NOT NULL,
  media_type        ENUM('initial','progress','other') NOT NULL DEFAULT 'initial',
  image_data        MEDIUMBLOB NOT NULL,
  mime_type         VARCHAR(100) NOT NULL,
  file_size_bytes   BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  ocr_text          MEDIUMTEXT NULL,
  uploaded_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_media_complaint_time (complaint_id, uploaded_at),
  INDEX idx_media_uploader_time (uploaded_by, uploaded_at),
  CONSTRAINT fk_media_complaint
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
