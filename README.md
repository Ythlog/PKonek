# PKonek

PKonek is a civic reporting platform for Pasig City. Residents can submit location-based reports about community issues, attach photos, check for nearby duplicate reports, and follow progress. Barangay officials can review complaints for their area, while Pasig administrators can monitor reports citywide and manage staff accounts and categories.

The citizen report form includes a Lumen writing assistant. The backend also provides Lumen OCR for uploaded evidence. Images are stored in Aiven MySQL; this project does not use Supabase for media storage.

## Main parts

- `lumen/apps/web` — Next.js website for residents, barangay officials, and Pasig administrators.
- `lumen/modules/accounts_complaints` — FastAPI API for authentication, roles, complaints, categories, duplicate checks, and staff activity.
- `media_backend` — FastAPI API for complaint image uploads and OCR.
- `chatbot_backend` — FastAPI adapter for Lumen AI Chat.
- `map_backend` — optional FastAPI map-marker and hotspot API. The current website uses the accounts API for its map queries; this service is not required for the normal run setup below.
- `lumen/modules/accounts_complaints/schema.sql` and `media_backend/schema.sql` — schemas used by the live APIs.

## Requirements

- Node.js and npm
- Python and the project virtual environment at `lumen/apps/api/.venv`
- An Aiven MySQL database with its CA certificate
- Lumen API key and secret for chatbot/OCR, and a Lumen chat instance ID for the chatbot

## Set up Aiven and environment

1. Create or select the Aiven MySQL database, download its CA certificate, and save it as `lumen/certs/aiven-ca.pem`.
2. Connect DBeaver to that database with SSL enabled. Run `lumen/modules/accounts_complaints/schema.sql`, then run `media_backend/schema.sql` against the same database. These are the schemas used by the live APIs. The older `db/schema.sql` is not the schema used by these API services.
3. Create `lumen/.env` with your own values:

   ```env
   DATABASE_URL=mysql+pymysql://avnadmin:<URL_ENCODED_PASSWORD>@<AIVEN_HOST>:<PORT>/defaultdb
   DB_SSL_CA=./certs/aiven-ca.pem
   JWT_SECRET=<a-long-random-secret>
   JWT_ALGORITHM=HS256
   JWT_EXPIRE_MINUTES=60

   LUMEN_API_KEY=<your-lumen-api-key>
   LUMEN_API_SECRET=<your-lumen-api-secret>
   LUMEN_API_BASE_URL=https://api.staging.nonlive.lumen.bayanichain.tech
   LUMEN_CHAT_INSTANCE_ID=<your-chat-instance-id>
   LUMEN_OCR_URL=https://api.staging.nonlive.lumen.bayanichain.tech/ocr/documents
   ```

   Use the same `JWT_SECRET` for the accounts, media, and chatbot services. URL-encode special characters in the database password. Keep `lumen/.env` and the CA certificate private; do not commit real keys or passwords.

4. Install Python dependencies in the shared virtual environment (from the repository root):

   ```powershell
   .\lumen\apps\api\.venv\Scripts\python.exe -m pip install -r .\lumen\apps\api\requirements.txt -r .\media_backend\requirements.txt -r .\chatbot_backend\requirements.txt
   ```

5. Install website dependencies and create its local environment file:

   ```powershell
   Set-Location .\lumen\apps\web
   npm install
   if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
   ```

   In `.env.local`, set `NEXT_PUBLIC_USE_MOCKS=false` to use Aiven and the live APIs. The proxy targets default to `127.0.0.1:8001`, `:8002`, and `:8003`. Restart Next.js after changing this file. For LAN testing, Next.js may ask you to add the current device IP to `allowedDevOrigins` in `next.config.ts`, then restart the website.

## Run the live application

Start each service in its own PowerShell window and leave all four windows running.

**1. Accounts and complaints API**

```powershell
Set-Location C:\xampp\htdocs\PKonek\lumen\modules\accounts_complaints
..\..\apps\api\.venv\Scripts\python.exe -m uvicorn accounts_complaints.standalone_main:app --port 8001
```

**2. Media and photo API**

```powershell
Set-Location C:\xampp\htdocs\PKonek\media_backend
..\lumen\apps\api\.venv\Scripts\python.exe -m uvicorn app:app --port 8002
```

**3. Lumen chatbot API**

```powershell
Set-Location C:\xampp\htdocs\PKonek\chatbot_backend
..\lumen\apps\api\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8003
```

**4. Next.js website**

```powershell
Set-Location C:\xampp\htdocs\PKonek\lumen\apps\web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API documentation is available at [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs), [http://127.0.0.1:8002/docs](http://127.0.0.1:8002/docs), and [http://127.0.0.1:8003/docs](http://127.0.0.1:8003/docs).

## Create demo accounts for live mode

The live accounts API does not use the frontend's mock demo users. Create live accounts from the accounts module; the command securely prompts for a password and skips accounts that already exist without changing their passwords.

```powershell
Set-Location C:\xampp\htdocs\PKonek\lumen\modules\accounts_complaints
..\..\apps\api\.venv\Scripts\python.exe -m accounts_complaints.create_demo_accounts
```

It creates `citizen@pkonek.demo`, `official@pkonek.demo` (Kapitolyo), and `admin@pkonek.demo`. Use the password entered during setup. Citizens sign in at `/login`; staff and administrators use `/staff/login`.

## Demo mode

To run the frontend without the live database or APIs, set `NEXT_PUBLIC_USE_MOCKS=true` in `lumen/apps/web/.env.local`, then restart Next.js. Demo mode uses sample data and the mock accounts shown on the sign-in page. Demo changes are stored in browser storage and do not create records in Aiven.

## Current implementation notes

- The citizen report flow supports categories, required map pinning, written descriptions, photo upload, duplicate checks, and “Me Too” support.
- Citizen “My reports” uses an authenticated endpoint that returns only the signed-in citizen’s complaints.
- Staff complaint lists are filtered by their selected barangay; Pasig administrators can view citywide complaints.
- The chatbot keeps a Lumen conversation while the report form is open. Refreshing the page starts a fresh chat display.
- The media API exposes a staff-only OCR endpoint; OCR is not run automatically on every upload.
- Some dashboard, notification, verification, and public-accountability features are available in demo mode but still need corresponding live API support. See `lumen/apps/web/README.md` for the frontend’s live-backend status details.
