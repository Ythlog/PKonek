# Progress

## Done

- Created the isolated `person4-resolution/` package and required subfolders.
- Added environment-based settings and engine/transaction helpers.
- Added the provisional single authentication seam and development identity headers.
- Added an empty API router, registration helper, inert scheduler lifecycle stubs, and standalone dev app.
- Added additive migration tables for verifications, category department routes, and escalation targets.
- Snapshotted the tracked `db/schema.sql` into the integration fixture; added a MySQL fixture and import smoke test.
- Documented teammate blockers and integration instructions.

## Next

- Replace the provisional auth seam when Person 2 delivers the real auth contract.
- Implement verification, routing, SLA/escalation, and response workflows in a later task step after teammate contracts arrive.
- Run the MySQL fixture on an available MySQL 8 instance and verify migration application.
- Resolve feature branch/commit access if the Git metadata write restriction is lifted.

## Assumptions

- The tracked root `db/schema.sql` is the schema snapshot to use; it includes the required tables, roles, and status codes.
- Authentication claims use `sub` and `role`, as specified; official department is looked up from `official_profiles`.
- DB datetimes use UTC and `DATETIME(3)`.
- The task's Git branch and commit requirements are blocked by repository metadata being unwritable in the current environment; the existing untracked root `package-lock.json` is unrelated and untouched.

