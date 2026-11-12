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

## Next

- Replace the provisional auth seam when Person 2 delivers the real auth contract.
- Run `python -m pytest -q` once pytest can be installed in `person4-resolution/.venv`.
- Implement verification, routing, SLA/escalation, and response workflows in a later task step after teammate contracts arrive.
- Run the MySQL fixture on an available MySQL 8 instance and verify migration application.
- User to run `git switch -c feature/person4-resolution`; the requested single attempt failed because Git could not create `.git/refs/heads/feature/person4-resolution`. Per instruction, no retry or workaround was attempted.

## Assumptions

- The tracked root `db/schema.sql` is the schema snapshot to use; it includes the required tables, roles, and status codes.
- Authentication claims use `sub` and `role`, as specified; official department is looked up from `official_profiles`.
- DB datetimes use UTC and `DATETIME(3)`.
- Git branch setup is blocked by permission creating `.git/refs/heads/feature/person4-resolution`; all changes remain unstaged and no commit was attempted.
- Pytest is unavailable and could not be installed because ensurepip temp writes are denied and PyPI DNS is unavailable; the real pytest command was executed and failed with `No module named pytest`.
- The MySQL test service is unavailable at `127.0.0.1:3306`.

