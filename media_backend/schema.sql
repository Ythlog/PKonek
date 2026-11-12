-- Run after lumen/modules/accounts_complaints/schema.sql.
-- Stores Supabase object URLs and metadata; image files are not stored in MySQL.
CREATE TABLE IF NOT EXISTS complaint_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  media_type ENUM('initial','progress','before','after','other') NOT NULL DEFAULT 'initial',
  storage_url VARCHAR(2048) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  original_filename VARCHAR(255) NULL,
  image_analysis JSON NULL,
  ocr_text MEDIUMTEXT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_media_complaint_time (complaint_id, uploaded_at),
  CONSTRAINT fk_media_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_uploader FOREIGN KEY (uploaded_by)
    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
