# RetailFlow

RetailFlow is a full-stack retail management system — inventory, sales, customers, purchases, and reporting in one dashboard, with role-based access control and secure cookie-based authentication. It's a monorepo with a **Hono + MongoDB** API and a **React + Vite** dashboard.

## Features

- 🔐 **Secure authentication** — JWT stored in an `httpOnly` cookie (never in `localStorage` or readable by client-side JS), bcrypt-hashed passwords, and a bootstrap rule where the very first registered account automatically becomes admin
- 👥 **Role-based access control (RBAC)** — four roles (`admin` > `manager` > `staff` > `viewer`) enforced hierarchically on both the API (every write route) and the UI (nav items and routes hide/redirect for roles that can't use them)
- 📊 **Dashboard** — overview of the business at a glance
- 📦 **Inventory management** — products with SKU, category, price, cost, stock levels, and a computed `in_stock` / `low_stock` / `out_of_stock` status derived from current stock vs. minimum stock
- 🧾 **Sales & Orders** — orders with embedded line items, auto-generated order numbers, and status tracking (`pending` → `processing` → `completed` / `cancelled`)
- 🧑‍🤝‍🧑 **Customers** — contact info, loyalty points/tier (`bronze` → `platinum`), total spend, and order count
- 📥 **Purchases** — restocking workflow, gated to staff-and-above
- 📈 **Reports** — revenue over configurable periods (24h/7d/30d/90d/1y), broken down by day
- ⌘ **Command palette** — quick keyboard-driven navigation/search
- 🔔 **Notifications panel**
- 🧪 **Demo mode** — if no database is configured, the API automatically falls back to a full in-memory data store so every feature (including auth) works out of the box for evaluation — data just doesn't survive a server restart

## Tech Stack

| Layer      | Technology                                            |
|------------|--------------------------------------------------------|
| API        | Hono (Node.js), TypeScript, Zod validation              |
| Auth       | JWT (`jose`), `httpOnly` cookies, `bcryptjs`            |
| Database   | MongoDB via Mongoose (with an in-memory demo-mode fallback) |
| Frontend   | React 18, Vite, React Router 6                          |
| State      | Zustand                                                  |
| UI         | Tailwind CSS, Framer Motion, Lucide icons                |

## Project Structure

```
The-Retail-Flow-App/
├── apps/
│   ├── api/                      # @retailflow/api — Hono backend
│   │   └── src/
│   │       ├── db/
│   │       │   ├── client.ts         # Mongo connection + demo-mode fallback
│   │       │   └── memoryStore.ts    # In-memory collections used in demo mode
│   │       ├── lib/
│   │       │   └── auth-cookies.ts   # JWT secret handling + httpOnly cookie helpers
│   │       ├── middleware/
│   │       │   ├── auth.ts            # Verifies JWT (Bearer header or cookie)
│   │       │   └── rbac.ts            # Role hierarchy + requireRole/requireAdmin/etc.
│   │       ├── models/                # Mongoose schemas: User, Product, Order, Customer
│   │       ├── routes/                # auth, products, orders, customers, reports
│   │       ├── seed.ts                 # Populates MongoDB with sample data
│   │       └── index.ts                # App entry point
│   └── web/                      # @retailflow/web — React dashboard
│       └── src/
│           ├── api/client.ts           # fetch wrapper (cookie-based, no token in JS)
│           ├── components/layout/       # DashboardLayout (nav, shell)
│           ├── features/
│           │   ├── auth/                # Login page
│           │   ├── dashboard/
│           │   ├── inventory/
│           │   ├── sales/
│           │   ├── customers/
│           │   ├── purchases/
│           │   ├── reports/
│           │   ├── settings/
│           │   ├── search/               # Command palette
│           │   └── notifications/
│           ├── lib/roles.ts             # Mirrors backend role hierarchy for UI gating
│           └── store/                   # Zustand stores (auth, ui)
└── README.md
```

## How It Works

1. **Registration/Login** — the API hashes passwords with bcrypt and, on success, signs a JWT (7-day expiry) and sets it as an `httpOnly` cookie. The very first account ever created on a fresh instance is automatically promoted to `admin` (checked server-side by counting existing users — never trusted from the client); every account after that defaults to `viewer`.
2. **Session restore** — on page load, the frontend doesn't check any locally-stored flag; it calls `GET /api/auth/me`, which only succeeds if the browser's cookie contains a still-valid JWT. This avoids ever trusting client-controlled state for "am I logged in."
3. **Authorization** — `authMiddleware` verifies the JWT on protected routes; `requireRole`/`requireStaff`/`requireAdmin` then checks the decoded role against a numeric hierarchy (`viewer: 0 < staff: 1 < manager: 2 < admin: 3`) before allowing the request through. The React app mirrors the same hierarchy in `lib/roles.ts` so a viewer never even sees a write-only action, and `RequireStaff` route guards stop direct URL access to staff-only pages as a second layer.
4. **Data layer** — if `MONGODB_URI` is set and reachable, all reads/writes go through Mongoose models. If not, the API transparently falls back to an in-memory store with the same collection shape, so every feature still works for local exploration — it just resets when the process restarts.
5. **Cross-origin cookies** — in production the frontend (Vercel) and API (Render) live on different domains, so the auth cookie is set with `SameSite=None; Secure` there (required for a cross-site cookie to be sent at all); locally, both apps run on `localhost`, so `SameSite=Lax` is used instead, since `None` requires HTTPS.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- (Optional) A MongoDB instance — local or [MongoDB Atlas](https://www.mongodb.com/atlas). Without one, the API runs in demo mode automatically.

### 1. API setup

```bash
cd apps/api
npm install
```

Create `apps/api/.env`:

```bash
MONGODB_URI=your_mongodb_connection_string   # omit to run in demo mode
JWT_SECRET=a_long_random_string               # required in production; auto-generated in dev if omitted
ALLOWED_ORIGINS=http://localhost:5173         # comma-separated list of allowed frontend origins
NODE_ENV=development
PORT=5000
```

```bash
npm run dev
```

The API starts on **http://localhost:5000**. Check `/health` for a quick status.

(Optional) seed sample products and customers into a real MongoDB database:

```bash
npx tsx src/seed.ts
```

### 2. Web setup

```bash
cd apps/web
npm install
```

Create `apps/web/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Open the local URL Vite prints (typically **http://localhost:5173**) and register an account — the first one becomes an admin automatically.

## Deployment

This repo is set up for the frontend and backend to live on separate hosts:

- **Frontend (`apps/web`)** — deploy to Vercel; `vercel.json` already rewrites all routes to `index.html` for client-side routing. Set `VITE_API_URL` to your deployed API's URL.
- **Backend (`apps/api`)** — deploy to a Node host (e.g. Render). Set `MONGODB_URI`, a real `JWT_SECRET`, `NODE_ENV=production`, and `ALLOWED_ORIGINS` to your deployed frontend's URL(s).

The API refuses to start in production without `JWT_SECRET` set, specifically to prevent silently running with a forgeable session secret.

## Roadmap / Ideas

- [ ] Supplier management (the `Product` model already references a `Supplier` that doesn't have its own model/routes yet)
- [ ] Real-time low-stock notifications wired into the notifications panel
- [ ] Exportable reports (CSV/PDF)
- [ ] Automated tests for the RBAC middleware and auth flows

## License

No license file is currently included — add one (e.g. MIT) if you intend to accept contributions or reuse elsewhere.

## Author

**Hasnain Jaffer**
- GitHub: [@Hasnain-jaffer](https://github.com/Hasnain-jaffer)
