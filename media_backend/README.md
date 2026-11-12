# PKonek Media Backend

Separate FastAPI service for Person 3's complaint photo upload flow. Image files
are stored in Supabase Storage; MySQL stores their URL and metadata.

## Current endpoint

`POST /complaints/{complaint_id}/media` accepts multipart form fields:

- `file`: JPEG, PNG, or WebP image, up to `MEDIA_MAX_SIZE_MB` (10 MB by default)
- `media_type`: `initial`, `progress`, `before`, `after`, or `other`
- `Authorization: Bearer <staff JWT>`

On success it returns the media row ID, complaint ID, type, URL, MIME type,
size, and upload timestamp. It rejects invalid images and unknown complaints.

## Setup

1. Apply `lumen/modules/accounts_complaints/schema.sql` to the target MySQL
   database, then apply this folder's `schema.sql`.
2. In `lumen/.env`, configure `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_KEY`, and optionally `SUPABASE_STORAGE_BUCKET` and
   `MEDIA_MAX_SIZE_MB`. Keep the Supabase service key server-side.
3. Create the named bucket in Supabase Storage and make it public for the
   returned public image URLs. Private bucket access needs a signed-URL contract.
4. From this folder, install `requirements.txt` and run
   `uvicorn app:app --reload --port 8002`.
5. Open `http://127.0.0.1:8002/docs` to inspect the endpoint.

## Current integration boundary

The existing accounts/complaints service only authenticates staff roles
(`official` and `pasig_admin`); its users table does not yet represent citizen
accounts or bind a complaint to a citizen owner. For that reason this first
upload endpoint is staff-only. Citizen uploads must wait until the team agrees
on the citizen auth and complaint ownership contract (Step 1), so one citizen
cannot attach files to another citizen's complaint. The storage and MySQL media
flow is in place for that agreed contract to extend.

The media table uses the current `accounts_complaints` schema's `complaints`
and `users` tables. Do not mix it with the separate draft `db/schema.sql`, which
defines a different version of those tables.
