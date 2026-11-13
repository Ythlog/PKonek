# PKonek Media Backend

FastAPI service for complaint image storage and Lumen OCR. Image bytes and
metadata are stored directly in Aiven MySQL; this feature does not use Supabase.

## Setup

1. Apply `lumen/modules/accounts_complaints/schema.sql` to the Aiven database.
2. Apply this folder's `schema.sql` to add the `complaint_media` table. Its
   `image_data MEDIUMBLOB` column stores up to 16 MB per image; the API defaults
   to a 10 MB upload limit.
3. Configure `DATABASE_URL`, optional `DB_SSL_CA`, `JWT_SECRET`,
   `LUMEN_API_KEY`, and `LUMEN_API_SECRET` in `lumen/.env`.
4. Install `requirements.txt`, then run `uvicorn app:app --reload --port 8002`.

## Endpoints

- `POST /complaints/{complaint_id}/media`: multipart `file` plus optional
  `media_type` (`initial`, `progress`, `other`). Citizen uploads are limited to
  their own complaints; staff can add progress media.
- `GET /media/{media_id}/image`: streams the stored image to staff.
- `POST /media/{media_id}/ocr`: sends stored image bytes to Lumen OCR and saves
  extracted text in `complaint_media.ocr_text`.

All endpoints require a valid bearer token. Image files are held in the Aiven
database, so database backup size and storage capacity should be monitored.
