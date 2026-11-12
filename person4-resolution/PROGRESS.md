# Progress

## Done

- Created the isolated `person4-resolution/` package and required subfolders.
- Added environment-based settings and engine/transaction helpers.
- Added the provisional single authentication seam and development identity headers.
- Added an empty API router, registration helper, inert scheduler lifecycle stubs, and standalone dev app.
- Added additive migration tables for verifications, category department routes, and escalation targets.
- Snapshotted the tracked `db/schema.sql` into the integration fixture; added a MySQL fixture and import smoke test.
- Documented teammate blockers and integration instructions.
- Implemented pure Python state transition rules, SLA calculations, and metric definitions.
- Added comprehensive domain tests covering actor permissions, required evidence/notes, threshold boundaries, paused clocks, escalation, repeated reopen cycles, and metric edge cases.
- Domain tests passed through a dependency-free direct runner (18 test functions, parametrized cases expanded); Python compilation passed.
- Added the requested `.gitignore` for the folder-local venv, Python/pytest caches, and `.env`.
- Read-only review of `db/person3_schema.sql` and `media_backend/schema.sql` confirmed `complaint_media.media_type` includes `after`, alongside `id`, `complaint_id`, `uploaded_by`, URL/type/size/name metadata, `image_analysis`, `ocr_text`, and upload time. Person 3 adds analysis jobs, not media table changes.
- Recorded that Step 4 should validate the referenced media row belongs to the complaint and has `media_type = 'after'`.
- Attempted folder-local venv setup. `ensurepip` was blocked copying its bundled wheel into sandbox temp; package installation was blocked by unavailable DNS to PyPI. `python -m pytest -q` was run and failed because pytest is not installed.
- Checked MySQL reachability: `127.0.0.1:3306` is not reachable, so `pkonek_test` migration verification cannot run here.
- Implemented notification type constants, transaction-scoped `notify`/recipient helpers, and raw-SQL repositories for list/count/read operations.
- Added authenticated notification list, unread-count, mark-read, and mark-all-read routes with ownership scoping and `{detail, code}` error bodies.
- Added MySQL integration tests for recipient selection, persistence, pagination/filtering, and cross-user isolation; tests skip promptly if MySQL is unreachable.
- Fixed the default database URL reference so the FastAPI application imports correctly.

## Next

- Replace the provisional auth seam when Person 2 delivers the real auth contract.
- Run `python -m pytest -q` once pytest can be installed in `person4-resolution/.venv`.
- Implement verification, routing, SLA/escalation, and response workflows in a later task step after teammate contracts arrive.
- Run the MySQL fixture on an available MySQL 8 instance and verify migration application.
- Commit the notification implementation after final path/status review.

## Assumptions

- The tracked root `db/schema.sql` is the schema snapshot to use; it includes the required tables, roles, and status codes.
- Authentication claims use `sub` and `role`, as specified; official department is looked up from `official_profiles`.
- DB datetimes use UTC and `DATETIME(3)`.
- The configured MySQL server is unreachable from this sandbox at `127.0.0.1:3306`; integration tests should run in the user's environment.

