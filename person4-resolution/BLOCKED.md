# Blocked on teammate-owned components

The following work is intentionally not implemented until the owners provide the agreed integration points:

1. **Real authentication (Person 2):** `resolution/security.py` currently contains a clearly marked provisional seam: Bearer JWT with HS256 by default, `sub` (user id), and `role` claims, plus `X-Dev-User-Id` / `X-Dev-Role` only when `APP_ENV=dev`. Person 2 must supply the production verifier/claims contract and user/official profile lookup behavior. This seam must be replaced or adapted before production use.
2. **Barangay logic:** the agreed schema has no barangays table and no `barangay_id`. Do not add barangay behavior, create a table, or alter any existing table until the owning teammate delivers an agreed schema and contract.
3. **AI before/after photo comparison (Person 3):** the migration reserves `ai_comparison`; no comparison logic is implemented pending Person 3's service contract.
4. **Media upload (Person 3):** evidence references existing `complaint_media`; no upload endpoint or storage behavior is implemented pending Person 3's ownership and integration contract.

