-- Additive Person 4 resolution tables for the PKonek MySQL 8 schema.
-- Apply after the read-only base schema in tests/fixtures/base_schema.sql.

CREATE TABLE IF NOT EXISTS complaint_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  complaint_id BIGINT UNSIGNED NOT NULL,
  citizen_id BIGINT UNSIGNED NOT NULL,
  verdict ENUM('confirmed','rejected','auto_timeout') NOT NULL,
  note TEXT NULL,
  evidence_media_id BIGINT UNSIGNED NULL,
  ai_comparison JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_verifications_complaint_time (complaint_id, created_at),
  CONSTRAINT fk_verifications_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  CONSTRAINT fk_verifications_citizen FOREIGN KEY (citizen_id) REFERENCES users(id),
  CONSTRAINT fk_verifications_evidence FOREIGN KEY (evidence_media_id) REFERENCES complaint_media(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS category_department_routes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  priority TINYINT UNSIGNED NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_department_route (category_id, department_id),
  CONSTRAINT fk_route_category FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  CONSTRAINT fk_route_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS escalation_targets (
  level TINYINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  label VARCHAR(150) NOT NULL,
  PRIMARY KEY (level),
  CONSTRAINT fk_escalation_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;
