-- PKonek / Lumen initial MySQL schema
-- Target: MySQL 8.0.16+ (enforced CHECK constraints)
-- Apply to an empty database. Image binaries remain in object storage;
-- this schema stores their URLs and metadata only.

CREATE DATABASE IF NOT EXISTS pkonek
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE pkonek;

CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id TINYINT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(32) NULL,
  account_status ENUM('pending','active','suspended','disabled') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_status (role_id, account_status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  contact_email VARCHAR(254) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS official_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  employee_code VARCHAR(80) NULL,
  verified_by BIGINT UNSIGNED NULL,
  verified_at DATETIME(3) NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_official_employee_code (employee_code),
  CONSTRAINT fk_official_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_official_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_official_verified_by FOREIGN KEY (verified_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  default_sla_hours SMALLINT UNSIGNED NOT NULL DEFAULT 72,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_statuses (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  label VARCHAR(80) NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_status_code (code),
  UNIQUE KEY uq_status_sort (sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(12) NULL,
  citizen_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  status_id TINYINT UNSIGNED NOT NULL,
  assigned_department_id BIGINT UNSIGNED NULL,
  assigned_official_id BIGINT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
  ai_severity ENUM('low','medium','high','critical') NULL,
  severity_score DECIMAL(5,2) NULL,
  address_text VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  due_at DATETIME(3) NULL,
  resolved_at DATETIME(3) NULL,
  verified_at DATETIME(3) NULL,
  reopened_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_complaints_public_id (public_id),
  KEY ix_complaints_citizen (citizen_id, submitted_at),
  KEY ix_complaints_status_category (status_id, category_id, submitted_at),
  KEY ix_complaints_department_status (assigned_department_id, status_id, due_at),
  KEY ix_complaints_official (assigned_official_id, status_id),
  KEY ix_complaints_location (latitude, longitude),
  CONSTRAINT fk_complaints_citizen FOREIGN KEY (citizen_id) REFERENCES users(id),
  CONSTRAINT fk_complaints_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_complaints_status FOREIGN KEY (status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_complaints_department FOREIGN KEY (assigned_department_id) REFERENCES departments(id),
  CONSTRAINT fk_complaints_official FOREIGN KEY (assigned_official_id) REFERENCES users(id),
  CONSTRAINT chk_complaint_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_complaint_longitude CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_complaint_severity_score CHECK (severity_score IS NULL OR severity_score BETWEEN 0 AND 100)
) ENGINE=InnoDB;

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
  uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_media_complaint_time (complaint_id, uploaded_at),
  CONSTRAINT fk_media_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_media_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_support (
  complaint_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (complaint_id, user_id),
  KEY ix_support_user (user_id, created_at),
  CONSTRAINT fk_support_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  old_status_id TINYINT UNSIGNED NULL,
  new_status_id TINYINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  change_source ENUM('citizen','official','admin','system') NOT NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_status_history_complaint (complaint_id, created_at),
  CONSTRAINT fk_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_history_old_status FOREIGN KEY (old_status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_history_new_status FOREIGN KEY (new_status_id) REFERENCES complaint_statuses(id),
  CONSTRAINT fk_history_actor FOREIGN KEY (changed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_responses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_responses_complaint_time (complaint_id, created_at),
  CONSTRAINT fk_responses_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_responses_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  complaint_id BIGINT UNSIGNED NULL,
  notification_type VARCHAR(60) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_notifications_user_unread (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sla_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('due','warning','overdue','escalated','completed') NOT NULL,
  event_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  escalation_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
  details JSON NULL,
  PRIMARY KEY (id),
  KEY ix_sla_complaint_event (complaint_id, event_at),
  CONSTRAINT fk_sla_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(500) NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_audit_actor_time (actor_user_id, created_at),
  KEY ix_audit_entity (entity_type, entity_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_writing_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  complaint_id BIGINT UNSIGNED NULL,
  prompt_summary TEXT NULL,
  generated_text MEDIUMTEXT NULL,
  accepted BOOLEAN NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_sessions_user_time (user_id, created_at),
  CONSTRAINT fk_ai_session_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_ai_session_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
) ENGINE=InnoDB;

INSERT INTO roles (id, name, description) VALUES
  (1, 'citizen', 'Pasig resident who submits and follows complaints'),
  (2, 'official', 'Local government official who handles complaints'),
  (3, 'pasig_admin', 'Pasig platform administrator');

INSERT INTO complaint_statuses (id, code, label, is_terminal, sort_order) VALUES
  (1, 'submitted', 'Submitted', FALSE, 1),
  (2, 'under_review', 'Under Review', FALSE, 2),
  (3, 'in_progress', 'In Progress', FALSE, 3),
  (4, 'resolved_pending_verification', 'Resolved — Awaiting Citizen Verification', FALSE, 4),
  (5, 'resolved', 'Resolved', TRUE, 5),
  (6, 'rejected', 'Rejected', TRUE, 6),
  (7, 'reopened', 'Reopened', FALSE, 7);

INSERT INTO complaint_categories (name, description, default_sla_hours) VALUES
  ('Roads and Sidewalks', 'Road damage, sidewalks, and pedestrian access', 72),
  ('Waste and Sanitation', 'Garbage collection, litter, and sanitation', 48),
  ('Flooding and Drainage', 'Flooding, blocked drains, and waterways', 24),
  ('Streetlights and Electrical', 'Street lighting and public electrical hazards', 48),
  ('Water Supply', 'Water service interruptions and leaks', 48),
  ('Public Safety', 'Public hazards requiring local government attention', 24),
  ('Other', 'Other civic concerns', 72);
