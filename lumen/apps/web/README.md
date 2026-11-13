# PKonek web app

The frontend for PKonek, a civic reporting platform for Pasig City. One Next.js app serves residents, barangay officials and Pasig administrators.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query, Leaflet, Recharts, Zod, Vitest.

## Run it

```powershell
cd lumen/apps/web
npm install
copy .env.example .env.local   # first time only
npm run dev
```

Open http://localhost:3000. By default the app runs in **demo mode**: it uses built-in data and needs no backend.

### Demo accounts

Every demo account uses the password `Demo1234!`. The sign-in pages also list them, so you can fill them in with one click.

| Role | Email | Signs in at | Lands on |
|---|---|---|---|
| Resident | `citizen@pkonek.demo` | `/login` | `/app` |
| Barangay official (Kapitolyo) | `official@pkonek.demo` | `/staff/login` | `/official` |
| Pasig administrator | `admin@pkonek.demo` | `/staff/login` | `/admin` |

Demo changes are saved in your browser. To start over, delete `pkonek.mock.v4` under DevTools → Application → Local Storage, then reload.

## Map tiles

The maps use Leaflet with CARTO Voyager tiles. CARTO requires an API key: without one, every tile shows an "API key required" watermark.

1. Request a free key with your e-mail at https://carto.com/basemaps/apikey. It arrives by e-mail and works right away, with no account or card.
2. In the CARTO dashboard, restrict the key to your sites, such as `localhost:3000` and your deployed domain, so nobody else can use up your quota.
3. Add it to `.env.local`: `NEXT_PUBLIC_CARTO_BASEMAP_KEY=your-key`
4. Restart `npm run dev`.

Without a key, the app uses the standard OpenStreetMap tiles. They need no key, but OpenStreetMap only allows light use, so use the CARTO key for demos and deployments.

| Plan | Limit | Price |
|---|---|---|
| Non-commercial | 5M tile requests a month | Free |
| Commercial | 1M tile requests a month | Free |
| Above that | Basemaps Commercial | From $500 a month |

Either way, the map shows the required "© OpenStreetMap contributors, © CARTO" attribution. The settings are in `src/components/map/config.ts`.

## Use the real backend

1. Start `lumen/modules/accounts_complaints` on port 8001. Start `media_backend` on port 8002 for photos.
2. In `.env.local`, set `NEXT_PUBLIC_USE_MOCKS=false`.
3. Restart `npm run dev`.

The browser calls `/api/*` and `/media/*` on the Next.js server, and `next.config.ts` forwards them to the targets in `API_PROXY_TARGET` and `MEDIA_PROXY_TARGET`. The backends have no CORS support, so this proxy is required.

### What works against the real backend today

| Feature | Real backend | Demo mode |
|---|---|---|
| Sign in, registration, roles | Yes | Yes |
| Report an issue, duplicate check, Me Too | Yes | Yes |
| Photo upload | Yes (media_backend) | Yes |
| Staff complaint list, filters, status changes | Yes | Yes |
| Admin users, categories, logs | Yes | Yes |
| Staff maps and analytics (computed in the browser) | Yes | Yes |
| Resident "My reports" list | No: `GET /complaints` is staff only | Yes |
| Community map for residents | No: needs a public complaints list | Yes |
| Official updates, full timeline, confirm or reopen | No: person4 endpoints use `db/schema.sql` | Yes |
| Notifications | No: person4 endpoints use `db/schema.sql` | Yes |
| Public accountability report | No: needs a public summary endpoint | Yes |

Each missing endpoint has a `TODO(backend)` comment in `src/lib/api/http.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build and type check |
| `npm run lint` | ESLint |
| `npm run test:run` | Every test once. `npm test` keeps watching. |

## Where things are

```
src/app/                 Routes. /app = residents, /official, /admin, /accountability (public)
src/components/ui/       Shared components (Button, Field, Modal, StatusBadge...). See /styleguide
src/components/shell/    Role shells, access check (RequireRole), page header
src/lib/api/             Typed API. http.ts = real backend, mock/ = demo mode
src/lib/                 Pure logic with tests: analytics, hotspots, filters, tracking
src/app/globals.css      Design tokens (colors, type, radius, shadows). The only place raw values live
```

## Design rules

- **Tokens only:** use token utilities such as `bg-brand-600`, `rounded-card` and `shadow-card`. Never hard-code hex colors, font sizes, radii or shadows. Tailwind's default palette is turned off.
- **Same tokens for every role:** only the layout differs. Residents get a top bar and a mobile tab bar; staff get the teal sidebar.
- **Accessibility:** every input sits in `<Field>` for its label, helper text and error. Touch targets are at least 44px, and status always shows a dot and a label.
- **Tests that check this:** `src/lib/contrast.test.ts` checks WCAG AA contrast for the token pairs, and `src/a11y.test.tsx` runs axe on the main screens.

The logo goes in `public/brand/pkonek-logo.png`. Until it's there, a text wordmark is shown.
