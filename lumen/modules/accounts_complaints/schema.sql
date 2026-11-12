-- =====================================================================
-- Lumen: Accounts and Complaint Records
-- MySQL 8 schema for Aiven. Safe to run more than once.
--
-- Run it with (from the lumen folder):
--   mysql --host=HOST --port=PORT --user=avnadmin -p --ssl-ca=./certs/aiven-ca.pem defaultdb < modules/accounts_complaints/schema.sql
-- or open this file in MySQL Workbench / DBeaver and execute it.
--
-- Notes
-- * Aiven enables sql_require_primary_key, so every table has a PRIMARY KEY.
-- * complaints.location is POINT SRID 4326. Always build it with
--   ST_GeomFromText('POINT(<lng> <lat>)', 4326, 'axis-order=long-lat').
-- * The bootstrap admin is NOT created here (it needs a bcrypt hash).
--   Run:  python -m accounts_complaints.create_admin  (see README.md)
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Accounts (JWT roles: citizen, official, pasig_admin)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('citizen','official','pasig_admin') NOT NULL,
  barangay      VARCHAR(100) NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Account activity logs (logins, logouts, account changes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_activity_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NULL,
  email       VARCHAR(255) NULL,     -- kept for failed logins with an unknown email
  action      VARCHAR(50) NOT NULL,  -- login_success, login_failed, logout, account_created,
                                     -- role_changed, deactivated, reactivated, password_changed
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  details     JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user_time (user_id, created_at),
  INDEX idx_activity_action_time (action, created_at),
  INDEX idx_activity_time (created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Audit trail (every create / update / status change, before + after)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,  -- NULL = public citizen / system
  entity_type   VARCHAR(50) NOT NULL,  -- user, complaint, category
  entity_id     BIGINT UNSIGNED NOT NULL,
  action        VARCHAR(50) NOT NULL,  -- create, update, status_change, support
  before_data   JSON NULL,
  after_data    JSON NULL,
  ip_address    VARCHAR(45) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id, created_at),
  INDEX idx_audit_actor (actor_user_id, created_at),
  INDEX idx_audit_time (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Complaint categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Complaints (location pin is required)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_no       VARCHAR(20) NOT NULL,           -- e.g. PSG-2026-000123
  category_id        INT UNSIGNED NOT NULL,
  title              VARCHAR(150) NOT NULL,
  description        TEXT NOT NULL,
  status             ENUM('open','in_progress','resolved','rejected') NOT NULL DEFAULT 'open',
  latitude           DECIMAL(9,6) NOT NULL,
  longitude          DECIMAL(9,6) NOT NULL,
  location           POINT NOT NULL SRID 4326,
  address_text       VARCHAR(255) NULL,
  barangay           VARCHAR(100) NULL,
  photo_url          VARCHAR(500) NULL,              -- Supabase Storage URL (later)
  reporter_name      VARCHAR(150) NULL,
  reporter_contact   VARCHAR(100) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,           -- NULL = public citizen
  report_count       INT UNSIGNED NOT NULL DEFAULT 1,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at        DATETIME NULL,
  UNIQUE KEY uq_complaints_reference (reference_no),
  SPATIAL INDEX idx_complaints_location (location),
  INDEX idx_complaints_dup (category_id, status, created_at),
  INDEX idx_complaints_latlng (latitude, longitude),
  INDEX idx_complaints_barangay (barangay),
  INDEX idx_complaints_status_time (status, created_at),
  FULLTEXT INDEX ft_complaints_text (title, description),
  CONSTRAINT fk_complaint_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_complaint_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_complaint_lat CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_complaint_lng CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- "+1" supports on an existing complaint (instead of a duplicate report)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaint_supports (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id     BIGINT UNSIGNED NOT NULL,
  reporter_contact VARCHAR(100) NULL,
  note             VARCHAR(500) NULL,
  latitude         DECIMAL(9,6) NOT NULL,
  longitude        DECIMAL(9,6) NOT NULL,
  ip_address       VARCHAR(45) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_complaint (complaint_id, created_at),
  INDEX idx_support_contact (complaint_id, reporter_contact),
  CONSTRAINT fk_support_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT chk_support_lat CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_support_lng CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Seed: default complaint categories (INSERT IGNORE keeps reruns safe)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO complaint_categories (code, name, description) VALUES
  ('roads',             'Roads and Potholes',      'Damaged roads, potholes, broken sidewalks'),
  ('flooding_drainage', 'Flooding and Drainage',   'Clogged drains, flooding, open manholes'),
  ('garbage',           'Garbage and Waste',       'Uncollected garbage, illegal dumping'),
  ('streetlights',      'Streetlights',            'Broken or missing streetlights'),
  ('illegal_parking',   'Illegal Parking',         'Vehicles blocking roads or sidewalks'),
  ('noise',             'Noise',                   'Excessive noise or disturbance'),
  ('water_supply',      'Water Supply',            'Leaks, no water, broken pipes'),
  ('stray_animals',     'Stray Animals',           'Stray or dangerous animals'),
  ('others',            'Others',                  'Anything not covered by other categories');
