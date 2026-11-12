-- Apply once to an existing database before deploying citizen registration.
ALTER TABLE users
  MODIFY role ENUM('citizen','official','pasig_admin') NOT NULL;
