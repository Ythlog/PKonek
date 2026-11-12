# Complaint Map API

Provides staff-authenticated map markers and location-based hotspot groups
from the existing `complaints.latitude` and `complaints.longitude` fields.
Hotspots are approximate grid clusters, configurable with `MAP_GRID_DEGREES`
(default `0.005`, about half a kilometer around Pasig's latitude). The default
minimum is three reports per grid cell. These are tunable query settings, not
persisted analysis results.

## Endpoints

- `GET /map/markers`: individual report pins; supports category, status,
  barangay, date range, map bounds, and a capped result limit.
- `GET /map/hotspots`: grouped report counts and representative grid-cell
  coordinates; supports category, status, barangay, date range, and a minimum
  count threshold.

Both endpoints require `Authorization: Bearer <staff JWT>` and use the current
accounts/complaints schema. They do not expose reporter contact details.

## Run

Configure the existing `DATABASE_URL`, optional `DB_SSL_CA`, and `JWT_SECRET`
in `lumen/.env`. From this folder, install `requirements.txt`, then run
`uvicorn app:app --reload --port 8004`. API documentation is at
`http://127.0.0.1:8004/docs`.
