-- Person 3 schema additions for PKonek / Lumen.
-- Import schema.sql first. This file assumes MySQL/MariaDB with JSON support
-- and the existing users, complaints, and complaint_media tables.
-- Image files live in Supabase Storage; MySQL stores URLs and processing data.

USE pkonek;

-- Tracks OCR/image-analysis work independently from the uploaded media row.
-- This supports asynchronous processing and retries without losing upload data.
CREATE TABLE IF NOT EXISTS media_analysis_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NULL,
  job_type ENUM('ocr','image_analysis') NOT NULL,
  status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  result JSON NULL,
  error_message TEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_analysis_media_type (media_id, job_type, created_at),
  KEY ix_analysis_queue (status, created_at),
  CONSTRAINT fk_analysis_job_media FOREIGN KEY (media_id)
    REFERENCES complaint_media(id) ON DELETE CASCADE,
  CONSTRAINT fk_analysis_job_requester FOREIGN KEY (requested_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional cache for map/hotspot responses. Complaint coordinates remain the
-- source of truth in complaints.latitude and complaints.longitude.
CREATE TABLE IF NOT EXISTS complaint_hotspot_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NULL,
  center_latitude DECIMAL(10,7) NOT NULL,
  center_longitude DECIMAL(10,7) NOT NULL,
  complaint_count INT UNSIGNED NOT NULL,
  window_start DATETIME NOT NULL,
  window_end DATETIME NOT NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_hotspots_category_window (category_id, window_start, window_end),
  KEY ix_hotspots_generated (generated_at),
  CONSTRAINT fk_hotspot_category FOREIGN KEY (category_id)
    REFERENCES complaint_categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_hotspot_latitude CHECK (center_latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_hotspot_longitude CHECK (center_longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Person 3 media fields are already present in complaint_media in schema.sql:
-- media_type ('initial', 'progress', 'before', 'after', 'other'), storage_url,
-- mime_type, file_size_bytes, original_filename, image_analysis JSON, and
-- ocr_text. Keep severity suggestions in complaints.ai_severity and
-- complaints.severity_score; officials/workflow may review these values.
-- Chatbot drafts are recorded in ai_writing_sessions in schema.sql.
