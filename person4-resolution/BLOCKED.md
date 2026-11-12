# Blocked on teammate-owned components

The following work is intentionally not implemented until the owners provide the agreed integration points:

1. **Real authentication (Person 2):** `resolution/security.py` currently contains a clearly marked provisional seam: Bearer JWT with HS256 by default, `sub` (user id), and `role` claims, plus `X-Dev-User-Id` / `X-Dev-Role` only when `APP_ENV=dev`. Person 2 must supply the production verifier/claims contract and user/official profile lookup behavior. This seam must be replaced or adapted before production use.
2. **Barangay logic:** the agreed schema has no barangays table and no `barangay_id`. Do not add barangay behavior, create a table, or alter any existing table until the owning teammate delivers an agreed schema and contract.
3. **AI before/after photo comparison (Person 3):** the migration reserves `ai_comparison`; `complaint_media` also has an `image_analysis` JSON column, and Person 3 adds `media_analysis_jobs` for OCR/image-analysis work. No comparison logic is implemented pending Person 3's service contract.
4. **Media upload (Person 3):** `media_backend/schema.sql` defines `complaint_media` with `id`, `complaint_id`, `uploaded_by`, `media_type` (`initial`, `progress`, `before`, `after`, `other`; default `initial`), `storage_url`, `mime_type`, `file_size_bytes`, `original_filename`, `image_analysis`, `ocr_text`, and `uploaded_at`. The existing schema supports an after-photo evidence check by querying for the complaint's media row where `media_type = 'after'` and referencing its `id` as `evidence_media_id`. Upload/storage endpoints remain Person 3's responsibility; this package will only consume the row/reference.

   Person 3's `db/person3_schema.sql` adds analysis job/cache tables but does not alter `complaint_media` or add an after-photo-specific constraint. The Step 4 validation should therefore verify a referenced media row belongs to the complaint and has `media_type = 'after'`; do not infer validity solely from a truthy flag once repository integration is built.

5. **Local verification environment:** the folder-local virtual environment can be created, but `ensurepip` cannot copy its bundled wheel into the sandbox temp directory and network DNS prevents installing requirements. `python -m pytest -q` therefore currently fails because pytest is not installed. No MySQL server is reachable at `127.0.0.1:3306` for `pkonek_test` verification.

