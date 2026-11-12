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
- Implemented official response request/response schemas, repository writes, authorization service, and POST `/api/complaints/{complaint_id}/responses` route.
- Response insert, audit log insert, and public citizen/supporter notifications execute within one transaction. Private responses do not notify.
- Added MySQL integration tests for public/private notification behavior, audit persistence, and department authorization.
- Implemented the authenticated complaint timeline endpoint, merging status history, responses, and SLA events in timestamp order.
- Citizen timeline access is limited to their own complaint and public history/responses; officials and admins receive all event types and visibility.
- Added MySQL integration tests covering visibility, ownership, merged item types, and ordering.
- Implemented official claim, administrator department/official assignment, and category-based auto-assignment with lowest-priority selection.
- Assignment writes, audit records, status history for claims, and ASSIGNED notifications share one transaction; officials are constrained by department or direct assignment.
- Added MySQL integration coverage for claim/history/audit/notification, admin reassignment, access denial, routing priority, and unroutable complaints.
- Implemented authenticated official/admin queue with department scoping, status/category/severity/overdue/assigned-to-me filters, pagination, support count, overdue flag, and time-left seconds.
- Queue uses MySQL `CASE` ordering for explicit critical/high/medium/low/NULL severity rank, after overdue-first ordering.
- Added MySQL integration coverage for risk order, null severity, derived fields, and filters.
- Implemented status-change endpoint with row locking, old-status transition validation through the domain state machine, actor authorization, and one-transaction status history/audit/notification writes.
- Completion-for-verification checks for an existing complaint_media row with media_type `after`; it sets resolved_at and sends the citizen VERIFICATION_REQUESTED. No media rows are inserted.
- Added MySQL integration tests for valid/missing/wrong after-photo, invalid transition, ownership denial, and atomic side effects.
- Implemented only confirmed citizen verification: original-citizen ownership and pending-verification status checks, confirmation row, resolved status/verified timestamp, history/audit, completed SLA event, and COMPLAINT_RESOLVED notifications within one transaction.
- Rejected verification currently returns HTTP 400 for the planned follow-up step.
- Added MySQL integration tests for confirmed side effects, actor/state restrictions, and rejected-verdict behavior.
- Added rejected citizen verification: records verdict, reopens complaint, sets reopened_at and a new due_at using configured reopen SLA ratio/minimum, writes a due SLA event, and notifies assigned officials in one transaction.
- Repeated reopen count of two or more also notifies active pasig_admin users.
- Expanded integration coverage for repeated reopens, new SLA cycles, and admin escalation notifications.
- Added a `BeforeAfterComparer` protocol and default `NullComparer`; non-null result values are stored in `complaint_verifications.ai_comparison` without calling any AI service.
- Updated `BLOCKED.md` to keep Lumen/CLIP/AI comparison blocked pending Person 3's implementation and contract.
- Added a full lifecycle integration test from submitted through claim/progress/Done, rejected/reopened, second Done, and confirmed/resolved; includes missing-photo, invalid transition, permission, and double-submit race assertions.
- Added an explicitly started APScheduler with configured SLA interval and API lifecycle wiring; import has no scheduler side effect.
- Added an idempotent due_at backfill using domain `due_at`, row-level `FOR UPDATE SKIP LOCKED`, guarded update, and a single `due` SLA event containing deadline and cycle metadata.
- Added a MySQL integration test that runs backfill twice and verifies only one deadline/event is created; clock injection is supported by the job function.
- Added scheduler job 2 for SLA warnings at the configured elapsed ratio, using an injected clock, row locking with `SKIP LOCKED`, and cycle-keyed event idempotency.
- Warning job skips `resolved_pending_verification` complaints and sends `SLA_WARNING` to the assigned official and active officials in the assigned department.
- Added integration coverage for threshold timing, once-per-cycle notification/event creation, and the paused verification state.
- Added scheduler job 3 for overdue processing at 100% SLA elapsed: records an overdue event per cycle, optionally reassigns to escalation target level 1, records escalation level 1 with the original department, and sends SLA_OVERDUE/ESCALATED notifications.
- If no level-1 escalation target exists, job records overdue and does not reassign or emit a level-1 escalation event.
- Added injected-clock integration tests for cycle idempotency, target/no-target handling, event details, notifications, and verification pause.
- Added scheduler job 4 at `due_at + category SLA × ESCALATION_L2_GRACE_RATIO`; it reads the current cycle's maximum escalation level, writes one level-2 escalated event, and notifies active pasig_admin users.
- Added injected-clock integration coverage for grace threshold, level progression, idempotency, admin notifications, and paused verification state.

## Next

- Replace the provisional auth seam when Person 2 delivers the real auth contract.
- Run `python -m pytest -q` once pytest can be installed in `person4-resolution/.venv`.
- Implement verification, routing, and SLA/escalation workflow routes in later steps after teammate contracts arrive.
- Run the MySQL fixture on an available MySQL 8 instance and verify migration application.
- Commit the notification implementation after final path/status review.

## Assumptions

- The tracked root `db/schema.sql` is the schema snapshot to use; it includes the required tables, roles, and status codes.
- Authentication claims use `sub` and `role`, as specified; official department is looked up from `official_profiles`.
- DB datetimes use UTC and `DATETIME(3)`.
- The configured MySQL server is unreachable from this sandbox at `127.0.0.1:3306`; integration tests should run in the user's environment.

