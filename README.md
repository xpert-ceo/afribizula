# Bizula (Afribizula)

Bizula is a business operating platform for small and medium businesses. This release is
a focused MVP for **retail** and **service** businesses. It covers:

- Account registration, sign-in, password reset and guided onboarding
- Inventory organised as **Departments → Categories → Products** (services use the same catalogue without stock)
- Sales recording with server-side pricing, stock control and voids
- Staff accounts, with staff-sales tracking that can be set to off, optional or required
- Monthly subscriptions paid through Paystack (three tiers; prices are **not yet confirmed**)
- An **Ambassador programme**: referral links, attribution, commissions and manually recorded payouts
- A separate **main-admin console** for users, businesses, ambassadors, commissions, payouts, payments, commission policy and the audit log

> Read [`docs/HANDOVER.md`](docs/HANDOVER.md) for the full technical handover, feature
> status and the decisions that still need the owner's approval. Read
> [`docs/AUDIT.md`](docs/AUDIT.md) for the state of the repository before this work.

## Repository layout

```
/              React 19 + Vite 8 web app (marketing site + signed-in app)
  src/
    Pages/       auth/, app/ (owner & staff), ambassador/, admin/, Onboarding, Account, NotFound
    Sections/    marketing page sections
    components/  app shell, UI primitives, route guards, auth layout
    context/     AuthContext (session state)
    lib/         API client, formatting, helpers
server/        Express 5 + Mongoose 9 API (ESM)
  app.js         builds the Express app (used by server.js and tests)
  server.js      entry point: config validation, DB connection, listen
  config/ middleware/ models/ routes/ services/ utils/ scripts/ test/
e2e/           browser smoke test (optional, see e2e/README.md)
docs/          AUDIT.md, HANDOVER.md
```

## Requirements

- Node.js 20 or later and npm 10
- MongoDB 6 or later (local or Atlas)
- Optional: Paystack secret key (subscriptions) and SMTP credentials (password-reset email)

## Local setup

```bash
# 1. API
cd server
cp .env.example .env          # then edit: MONGO_URI, JWT_SECRET (openssl rand -hex 32), CLIENT_URL, APP_URL
npm install
npm run create-admin -- --email you@example.com --name "Main Admin"   # prompts for the password
npm run dev                   # http://localhost:5000/api/health

# 2. Web app (new terminal, repository root)
cp .env.example .env.local    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # http://localhost:5173
```

Leave `PAYSTACK_SECRET_KEY` empty and checkout shows "payments not configured". Leave
`SMTP_HOST` empty and "forgot password" tells the user that email reset is unavailable;
an admin can generate a one-time reset link from **Admin → Users** instead.

If you are upgrading a database created by the earlier auth code, run the role migration once:

```bash
cd server && npm run migrate:roles            # dry run, report only
cd server && npm run migrate:roles -- --apply # write changes
```

## Commands

| Where | Command | What it does |
|---|---|---|
| root | `npm run dev` | Vite dev server |
| root | `npm run build` | Production build to `dist/` |
| root | `npm run lint` | ESLint (frontend and server) |
| root | `npm run preview` | Serve the production build |
| server | `npm start` / `npm run dev` | Start the API (`dev` uses nodemon) |
| server | `npm test` | 30 API tests against an in-memory MongoDB and a mock Paystack |
| server | `npm run check` | Syntax check and module load |
| server | `npm run create-admin -- --email … --name …` | Create or promote the main admin |
| server | `npm run migrate:roles [-- --apply]` | One-off migration of legacy user roles |

## Roles

| Role | Home | Can do |
|---|---|---|
| `owner` | `/app` | Everything for their own business: inventory, sales, staff, settings, billing |
| `staff` | `/app` | Record sales, view products, see their own sales |
| `ambassador` | `/ambassador` | Referral link, referrals, commissions, payouts, payout details |
| `admin` | `/admin` | Platform administration (created by CLI only) |

Every rule is enforced by the API. The frontend guards only improve the user experience.

## Deployment

- **Frontend:** Vercel (`vercel.json` adds the SPA rewrite). Set `VITE_API_URL` in the Vercel project.
- **API:** not deployed yet. Any Node host works (Render, Railway, Fly, a VPS). Set the
  variables from `server/.env.example`, `NODE_ENV=production`, `TRUST_PROXY=1` behind a proxy,
  and register `https://<api-host>/api/billing/webhook` as the Paystack webhook URL.

See `docs/HANDOVER.md` → "Environment and setup" for details and the current deployment status.
