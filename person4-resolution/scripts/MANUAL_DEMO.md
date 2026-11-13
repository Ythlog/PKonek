# Manual demo: status updates, citizen updates, open/resolved counts

## Setup (once, or any time you want fresh data)

XAMPP MySQL must be running. From `person4-resolution/`:

```powershell
.\.venv\Scripts\python.exe scripts\setup_manual_demo.py
.\.venv\Scripts\python.exe -m uvicorn resolution.dev_app:app --app-dir . --env-file .env.demo
```

Open http://127.0.0.1:8000/docs. Leave the terminal open while you test. Press Ctrl+C to stop.

The setup script only drops and recreates the `pkonek_manual` database. Your real `pkonek` database is not touched.

## Who you can act as

In `/docs`, click an endpoint, then **Try it out**, and fill in the `X-Dev-User-Id` and `X-Dev-Role` fields.

| User | X-Dev-User-Id | X-Dev-Role | Notes |
|---|---|---|---|
| Juan (citizen) | 1 | citizen | Owns complaints 1, 3, 5 |
| Maria (citizen) | 2 | citizen | Owns complaints 2, 4 |
| Ana (official) | 3 | official | Engineering Office (complaints 1, 2, 3) |
| Ben (official) | 4 | official | Sanitation Office (complaints 4, 5) |
| Admin | 5 | pasig_admin | Sees everything |

Starting data: complaint 1 is **Submitted** and is the one to walk through. Complaint 2 is In Progress, 3 and 5 are Resolved, and 4 is Submitted.

## 1. Check the counts first (Ana)

`GET /api/official/dashboard` as Ana (3, official). Expected `cards`: `total 3, open 2, resolved 1`.

## 2. Official updates the status and adds notes (Ana)

1. `POST /api/complaints/{complaint_id}/status`, complaint_id `1`:
   ```json
   {"to_status": "in_progress", "note": "Crew scheduled for tomorrow"}
   ```
2. `POST /api/complaints/{complaint_id}/responses`, complaint_id `1` (public progress note):
   ```json
   {"body": "Asphalt patching is 50% done.", "is_public": true}
   ```
3. Same endpoint again with a private note:
   ```json
   {"body": "Internal: need extra asphalt.", "is_public": false}
   ```
4. Mark it done. This needs the after-photo row the script created (id `1`):
   ```json
   {"to_status": "resolved_pending_verification", "note": "Pothole patched", "after_media_id": 1}
   ```

## 3. Citizen sees the updates (Juan)

- `GET /api/complaints/{complaint_id}/timeline`, complaint_id `1`, as Juan (1, citizen). It shows the public note. The private note does not appear.
- `GET /api/notifications` as Juan. It shows STATUS_CHANGED, OFFICIAL_RESPONSE, and VERIFICATION_REQUESTED.
- `GET /api/notifications/unread-count` as Juan.
- Privacy check: the same timeline call as Maria (2, citizen) returns **403**.
- Compare: the same timeline call as Ana shows every status change and both notes.

## 4. Counts change after resolving

1. Juan confirms the fix: `POST /api/complaints/{complaint_id}/verification`, complaint_id `1`, as Juan:
   ```json
   {"verdict": "confirmed", "note": "Fixed, thanks"}
   ```
2. `GET /api/official/dashboard` as Ana. Now `open 1, resolved 2`.
3. `GET /api/admin/overview` as Admin (5, pasig_admin). All departments: `total 5, open 2, resolved 3`.
4. `GET /api/public/accountability/departments` needs no headers. It shows per-department totals.

To start over, stop the server, run the setup script again, and start the server.

## Common errors

- **409 INVALID_TRANSITION**: that status change isn't allowed from the current status (for example, submitted straight to resolved).
- **409 AFTER_PHOTO_REQUIRED**: you marked it done without `"after_media_id": 1`.
- **403 FORBIDDEN_COMPLAINT**: the official isn't in that complaint's department, or the citizen doesn't own it.
- **503**: the app can't reach MySQL. Check that XAMPP MySQL is running and that you started the app with `--env-file .env.demo`.
