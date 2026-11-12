# Integration instructions

Everything in this component is isolated in `person4-resolution/`. No shared/root files have been changed.

## Mount the API

In the shared FastAPI application, add:

```python
from resolution.api import register
register(app)
```

Add `person4-resolution/` to the Python import path or install it as a package when the repository integration structure is agreed. The current `register()` includes the empty resolution router; it intentionally has no route handlers in this step.

## Apply the migration

After applying the existing base schema, run `person4-resolution/migrations/001_person4_resolution.sql` against the same MySQL 8 database. It only creates the three Person 4 tables if absent. Do not edit the shared schema as part of this integration.

## Scheduler lifecycle

Call `start_scheduler()` during application startup and `stop_scheduler()` during shutdown once the SLA service is implemented. Both are currently inert stubs.

## Existing schema snapshot

`tests/fixtures/base_schema.sql` is a test-only snapshot of tracked `db/schema.sql`. It is not a replacement for the shared schema and should be refreshed by Person 4 if that schema changes before merge.

