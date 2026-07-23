# RetailFlow Enterprise

Two independent apps, each with its own dependencies and its own run
command — no root `package.json`, no monorepo tooling, nothing shared:

```
retailflow-enterprise/
├── apps/
│   ├── api/     ← Hono + Drizzle backend (deploys to Render)
│   └── web/     ← React + Vite frontend (deploys to Vercel)
├── .gitignore
└── README.md
```

## Running locally (two terminals)

**Terminal 1 — backend**
```bash
cd apps/api
npm install
cp .env.example .env   # then fill in real values, see below
npm run dev
```
Runs on http://localhost:5000. Health check: http://localhost:5000/health

> **Note:** `npm run dev` runs the TypeScript source directly (via `tsx`)
> and auto-restarts on changes — this is what you want locally. `npm run
> build` (compiles to `dist/`) followed by `npm start` (runs the compiled
> output) is the production path Render uses; running `npm start` without
> building first will fail with `Cannot find module '.../dist/index.js'`
> since there's nothing there yet.

**Terminal 2 — frontend**
```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```
Runs on http://localhost:3000.

That's it — each app is installed and started completely independently.
Vite is already configured to proxy `/api` to `localhost:5000` in dev
(`apps/web/vite.config.ts`), and in production the frontend talks to the
API over `VITE_API_URL` instead.

## Environment variables

**`apps/api/.env`** (copy from `.env.example`):
- `MONGODB_URI` — a real MongoDB connection string. Without one, the API
  runs in demo mode: everything (auth, products, orders, customers,
  reports) works with real in-memory persistence for the life of the
  process, but resets on restart. A free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster works well
  here for real, durable persistence.
- `JWT_SECRET` — generate with `openssl rand -hex 32`. If left unset in
  development, a random one is generated per-run (sessions won't survive
  a restart); in production it's required and the server refuses to
  start without it.
- `ALLOWED_ORIGINS` — comma-separated list of frontend origins allowed to
  call the API with credentials. Leave unset locally. **In production,
  set this to your real Vercel URL** (see Deployment below) — without it,
  the deployed frontend can't authenticate at all.

**`apps/web/.env`** (copy from `.env.example`):
- `VITE_API_URL` — the API's base URL, e.g. `http://localhost:5000/api`
  locally or `https://your-api.onrender.com/api` in production.

## Deployment

### Backend → Render
1. New Web Service, root directory `apps/api`.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Environment variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`,
   and `ALLOWED_ORIGINS` set to your Vercel URL once you have it (step below).

### Frontend → Vercel
1. New Project, root directory `apps/web`.
2. Framework preset: Vite (auto-detected).
3. Environment variable: `VITE_API_URL` set to your Render URL + `/api`,
   e.g. `https://retailflow-api.onrender.com/api`.
4. `apps/web/vercel.json` is already included with the SPA rewrite rule
   client-side routing needs (without it, refreshing on `/inventory` or
   any non-root route 404s).

### After both are deployed
Go back to Render and set `ALLOWED_ORIGINS` to your actual Vercel URL
(e.g. `https://retailflow.vercel.app`), then redeploy the API. This is a
two-way handshake — the frontend needs the API's URL, and the API needs
to know the frontend's URL is allowed to send credentials — so the last
step is always circling back to fill in the real Vercel URL once Vercel
has assigned it.

The auth cookie is configured to work across these two different domains
(`SameSite=None; Secure` in production) — this only works over HTTPS,
which both Render and Vercel provide by default.
