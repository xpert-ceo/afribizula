# Bizula MVP: technical handover

Branch: `mvp/audit-and-completion` (based on `main` @ `79789b7`). Pre-change state: [`AUDIT.md`](AUDIT.md).

This document describes what the code does now and how it was verified. Every claim
marked "verified" was exercised by a test I ran (section 13 gives the commands and results).
Nothing was deployed, and no production system was accessed.

---

## 1. Purpose and scope

Bizula helps small businesses run day-to-day operations. The first release is
deliberately narrow and **global-ready**: country and currency are chosen per business,
nothing is hard-wired to Nigeria, and money is stored in minor units.

**In this MVP:** accounts and roles; guided onboarding; retail catalogue (Departments →
Categories → Products) with stock; service catalogue (same structure, no stock); sales
recording; staff with configurable sales tracking; monthly subscriptions through Paystack
(three tiers); the Ambassador programme; a separate main-admin console; an audit log.

**Not in this MVP** (marketing mentions them; see section 14): bookings, invoices,
commitment payments, logistics, B2B marketplace, bulk pricing, supplier management,
order tracking, platform or logistics commissions, Google sign-in, newsletter.

## 2. Architecture

```
Browser ── React SPA (Vite build, Vercel) ──HTTPS + Bearer JWT──► Express API ──► MongoDB
                                                                     │
                                         Paystack ◄─ initialize/verify ┤
                                         Paystack ─► POST /api/billing/webhook (HMAC-SHA512)
                                         SMTP (optional) ◄─ password-reset email
```

- **Frontend:** React 19, react-router-dom 7, Vite 8, Tailwind 4 (marketing), plain CSS
  (`src/styles/app.css`) for the signed-in app, and axios. Signed-in areas are code-split.
- **Backend:** Express 5 (async errors reach the error handler natively), Mongoose 9,
  bcryptjs, jsonwebtoken, helmet, express-rate-limit, nodemailer. ESM throughout.
- **One auth system:** JWT. The unused Firebase code was removed (see `AUDIT.md`). No second auth system was added.
- `server/app.js` builds the app from a validated config object. `server/server.js`
  validates the environment, connects to MongoDB and listens. The tests use `createApp` directly.

## 3. Repository structure

```
src/
  App.jsx                 all routes and guards
  main.jsx                providers (Helmet, Router, Auth)
  context/AuthContext.jsx session state, login/register/logout, homeFor(role)
  components/routing/Guards.jsx  RequireAuth(roles, allowUnonboarded), GuestOnly
  components/app/         AppShell (role-specific navigation), ui.jsx (Field, Alert, Loader, Empty, Badge…)
  components/auth/        AuthLayout, AuthInput (shared by the auth pages)
  lib/                    api.js (axios + token + error helpers), useFetch, useAction, format (money), geo, policy
  Pages/auth/             Login, Register, ForgotPassword, ResetPassword
  Pages/Onboarding.jsx, Account.jsx, NotFound.jsx
  Pages/app/              Dashboard, Inventory, Sales, Staff, Settings, Billing, BillingCallback
  Pages/ambassador/       AmbassadorDashboard
  Pages/admin/            Overview, Users, Businesses, Ambassadors, Commissions, Payouts, Payments, Settings, AuditLog
  Sections/, components/layout/  marketing site (pre-existing; decorative controls fixed)
server/
  config/   env.js (validation), db.js, plans.js
  middleware/ authMiddleware.js (protect, requireRole, loadBusiness, requireActiveSubscription), errorHandler.js
  models/   User, Business, Inventory (Department/Category/Product), Sale, Payment,
            Ambassador (Ambassador/Referral/Commission/Payout), System (Setting/AuditLog)
  controllers/authController.js
  routes/   auth, business (+staff), inventory, sales, billing (+webhook), ambassador, admin, public
  services/ paystack, billing, commissions, mailer, session
  utils/    ApiError, validate, codes
  scripts/  create-admin.js, migrate-001-roles.js
  test/     helpers.js + 5 test files (node:test)
e2e/        browser smoke test (optional)
```

## 4. Frontend routes and roles

| Path | Who | Notes |
|---|---|---|
| `/` | public | Marketing page |
| `/login`, `/register`, `/forgot-password` | signed-out only | `/register?ref=CODE` pre-fills and validates a referral code |
| `/reset-password?token=…` | anyone | Works for emailed and admin-generated links |
| `/onboarding` | owner | Required before any `/app` page |
| `/app` | owner, staff | Dashboard |
| `/app/inventory` | owner (edit), staff (read-only) | |
| `/app/sales` | owner, staff | Staff see only their own sales |
| `/app/staff`, `/app/settings`, `/app/billing`, `/app/billing/callback` | owner | |
| `/ambassador` | ambassador | Ambassador Dashboard |
| `/admin/*` | admin | overview, users, businesses, ambassadors, commissions, payouts, payments, settings, audit |
| `…/account` | each role | Change password. Forced when `mustChangePassword` is set. |
| `*` | anyone | 404 page |

A signed-in user who opens another role's area is redirected to their own home. This is
only a convenience. **The API enforces every rule** (section 7).

## 5. Authentication flow

1. **Register** `POST /api/auth/register {name, email, password, accountType: business|ambassador, referralCode?}`.
   Passwords need at least 8 characters with a letter and a number, and are hashed with bcrypt (cost 12).
   Business accounts get role `owner`. Ambassador accounts get role `ambassador` and a
   `pending` Ambassador record.
2. **Login** `POST /api/auth/login`. The response is `{token, user, business, ambassador}`.
   `user` is a safe projection (`User.toSafeJSON`), and **the password hash is never returned**
   (`password` has `select: false`). Login works the same for unknown emails and wrong passwords (generic 401).
3. The token is stored in `localStorage` (`bizula_token`) and sent as `Authorization: Bearer`.
   It expires after `JWT_EXPIRES_IN` (default 7d).
4. **Every request reloads the user from the database** (`protect`). Suspensions, role changes and
   password changes take effect immediately. The role inside the token is never trusted.
   Tokens issued before a password change are rejected.
5. On app load, `GET /api/auth/me` restores the session. Any 401 clears it and returns the user to `/login`.
6. **Forgot password:** if SMTP is configured, the API emails a one-time link (the token is stored hashed,
   expires after 1 hour and works once). The response is the same whether or not the email exists. **Without SMTP the endpoint
   returns 503** with an honest message instead of pretending to send.
   An admin can always generate a one-time reset link from Admin → Users.
7. **Staff** are created by the owner with a temporary password and must change it at first sign-in.
8. **Admins** are created only with `npm run create-admin` on a trusted machine (password from
   `ADMIN_PASSWORD` or a prompt). There is no public route that creates or promotes admins.
9. `/api/auth/*` is rate-limited per IP (`AUTH_RATE_LIMIT_MAX` per `AUTH_RATE_LIMIT_WINDOW_MINUTES`).

## 6. Data models

All money fields are **integers in minor units** (kobo for NGN), with the currency stored alongside.

| Model | Key fields | Integrity rules |
|---|---|---|
| `User` | name, email (unique, lower-case), password (hash, `select:false`), role `owner/staff/ambassador/admin`, status `active/suspended`, business, onboardingCompleted, mustChangePassword, passwordChangedAt, reset token hash and expiry, legacyRole | One role per user |
| `Business` | owner (unique), name, type `retail/service`, country (ISO-3166), currency (ISO-4217), settings {staffSalesTracking `off/optional/required`, lowStockThreshold}, subscription {plan, status, currentPeriodEnd}, status | One business per owner |
| `Department` / `Category` / `Product` | business (all three), category → department; product: name, sku, price, costPrice, trackStock, stockQuantity, active | Names are unique per parent (case-insensitive); SKU is unique per business; a parent must belong to the same business; departments and categories with children cannot be deleted; products with sales are deactivated instead of deleted |
| `Sale` | business, items[{product, name, unitPrice, quantity, lineTotal}], total, currency, paymentMethod, staff, recordedBy, status `completed/void` | Prices come from the DB, not the client; stock is decremented atomically and the sale rolls back if any line fails; voiding restores stock |
| `Payment` | business, user, plan, amount, currency, reference (unique), status `initialized/success/failed`, periodStart/End, source `verify/webhook` | Applied exactly once (atomic claim); amount and currency must match |
| `Ambassador` | user (unique), code (unique), status `pending/active/suspended`, payoutDetails | |
| `Referral` | ambassador, code, referredUser (**unique**), business, status `signed_up/converted`, convertedAt | One attribution per account |
| `Commission` | ambassador, referral, payment (**unique**), isFirstPayment, baseAmount, amount, currency, status `awaiting_policy/pending/approved/paid/void`, policySnapshot, approvedBy, voidReason, payout | One commission per payment |
| `Payout` | ambassador, commissions[], amount, currency, method, reference, note, paidAt, recordedBy | Only approved, unpaid commissions of one ambassador, one currency |
| `Setting` | key, value | `commission_policy` |
| `AuditLog` | actor, action, targetType, targetId, details | Append-only |

**Migration:** `server/scripts/migrate-001-roles.js` converts legacy `role` values (`service`, `retail`, …) to
`owner` and keeps the old value in `legacyRole`. It also lower-cases emails, sets missing `status`, and sends
legacy "onboarded" owners without a business back to onboarding. It runs as a dry run by default, is idempotent and
does not delete anything. It was verified against an in-memory DB: the dry run wrote nothing, `--apply` converted, and a second run made no changes.

## 7. API routes

Base path `/api`. Errors are returned as `{message, details?, code?}`. `details` maps field names to messages.
Special codes: `ONBOARDING_REQUIRED` (409), `SUBSCRIPTION_REQUIRED` (402).

| Route | Access |
|---|---|
| `GET /health` | public. Reports DB state. |
| `GET /public/plans`, `GET /public/referral-codes/:code` | public (code check returns only whether the code is valid and active) |
| `POST /auth/register, /login, /forgot-password, /reset-password` | public, rate-limited |
| `GET /auth/me`, `POST /auth/change-password` | signed in |
| `POST /business/onboarding` | owner |
| `GET /business`, `GET /business/summary` | owner, staff (summary is scoped to the staff member's own sales for staff) |
| `PATCH /business` | owner |
| `GET/POST /staff`, `PATCH /staff/:id` | owner |
| `GET /inventory/departments, /categories, /products` | owner, staff |
| `POST/PATCH/DELETE /inventory/departments[/:id]`, `…/categories[/:id]`, `…/products[/:id]`, `POST /inventory/products/:id/stock` | owner (+ active subscription when enforcement is on) |
| `GET /sales` | owner (all), staff (own) |
| `POST /sales` | owner, staff (+ subscription when enforced) |
| `POST /sales/:id/void` | owner |
| `GET /billing`, `POST /billing/checkout`, `GET /billing/verify?reference=` | owner (`GET /billing` also staff) |
| `POST /billing/webhook` | Paystack only. Raw body, `x-paystack-signature` HMAC-SHA512 checked. |
| `GET/PATCH /ambassador/me`, `GET /ambassador/referrals, /commissions, /payouts` | ambassador (own records only) |
| `GET /admin/stats, /users, /businesses, /payments, /ambassadors, /referrals, /commissions, /payouts, /settings/commission-policy, /audit-log` | admin |
| `PATCH /admin/users/:id/status`, `POST /admin/users/:id/password-reset-link`, `PATCH /admin/businesses/:id/status`, `PATCH /admin/ambassadors/:id`, `PATCH /admin/commissions/:id`, `POST /admin/payouts`, `PUT /admin/settings/commission-policy` | admin (each is written to the audit log) |

**Data scoping:** the business id always comes from the authenticated user (`loadBusiness`) and never from
the request, so a user cannot read or change another business's data (verified by test).

## 8. Admin Dashboard (main admin)

`/admin`. The API requires role `admin` on every `/api/admin` route (`router.use(protect, requireRole("admin"))`).

- **Overview:** users by role, new users, businesses, active subscriptions, revenue, sales count, ambassadors,
  referrals, commission totals by status, and warnings for a missing policy or pending applications.
- **Users:** search and filter, suspend or activate with a reason, generate a one-time reset link. Admin accounts cannot be suspended here.
- **Businesses:** list with owner, subscription and settings; suspend or activate. Suspension blocks the owner and staff from business features.
- **Ambassadors:** approve pending applications, suspend or reactivate, view referrals and payout details.
- **Commissions:** tabs by status; approve pending; void with a reason (shown to the ambassador); select approved
  commissions and **record a payout** made outside Bizula (method, reference, date, note).
- **Payouts / Payments:** read-only history.
- **Commission policy:** set type (percent or fixed), value, and basis (first payment or every payment). The screen warns that this is an owner decision.
- **Audit log:** every admin action and sensitive event.

## 9. Ambassador Dashboard

**Flow (verified end to end in the browser and in the API tests):**

1. A person registers with **Ambassador** selected. The account is created with status `pending`.
2. An admin approves the account in Admin → Ambassadors. The code becomes usable.
3. The ambassador shares `APP_URL/register?ref=CODE`. The sign-up page validates the code live.
   The code is kept in `sessionStorage` for the browser session.
4. On sign-up the server checks:
   - the code exists and the ambassador is `active` (pending and suspended codes are rejected);
   - **no self-referral**: the referred email is compared to the ambassador's email after
     normalisation (case, `+tag`, and Gmail dots);
   - **no duplicates**: `Referral.referredUser` is unique, so an account is attributed at most once.
     Attribution happens only at sign-up and cannot be changed later.
5. When the referred business's subscription payment is **verified with Paystack** (callback or
   webhook), the referral becomes `converted`. A commission is recorded if the ambassador is active.
   `Commission.payment` is unique, so a payment produces at most one commission even when the callback and webhook both arrive.
6. **No rate is hard-coded.** Until an admin sets a commission policy, commissions are stored as
   `awaiting_policy` with no amount. Setting the policy prices them, or voids them if they are not eligible
   (for example, a renewal under a first-payment-only policy). Each commission keeps a snapshot of the policy used.
7. The admin approves each commission, then records a payout. The commissions become `paid`, and a commission cannot be paid twice.
8. The dashboard shows status, code, a copyable link, sign-ups, conversions, totals by status, the
   commission terms (or "not set yet"), and tables of referrals (emails masked), commissions and payouts.
   The ambassador can enter payout details, which only admins can see.

**Backend authorization:** all `/api/ambassador` routes require role `ambassador` and only return the caller's own records.
Owners and staff get 403 on ambassador and admin routes (tested).

**Known limits:** self-referral detection is email-based. Someone could still register a business under a
different email. There are no payout requests, no automated transfers and no clawback on refunds.

## 10. Subscriptions and payments

- Plans (`server/config/plans.js`): **Service ₦6,000, Retail ₦10,000, Enterprise ₦20,000 per month**, taken
  from the marketing page and marked `priceConfirmed: false`. The billing page tells users the prices are provisional.
- Monthly only. **No trial and no free tier** (not decided). Plans do not gate features; every plan gets all MVP features.
- Checkout: `POST /billing/checkout {plan}` creates a `Payment` and calls Paystack `transaction/initialize`
  (amount in subunits, `callback_url = APP_URL/app/billing/callback`). The browser is sent to Paystack.
- Confirmation: the callback page calls `GET /billing/verify`, which calls Paystack `transaction/verify`. The
  webhook `charge.success` does the same. Both run through one idempotent function that checks the
  status, amount and currency, then extends the subscription by one month from the later of now or the current period end.
  There is no proration. Renewals are manual (the owner pays again), and Paystack recurring plans are not used.
- `SUBSCRIPTION_ENFORCEMENT=false` (default): nothing is blocked. When set to `true`, inventory and sales writes need an active subscription (402).
- Without `PAYSTACK_SECRET_KEY`, checkout returns 503 and the UI says payments are not configured.
- References: [Paystack webhooks](https://paystack.com/docs/payments/webhooks/), [Accept payments](https://paystack.com/docs/payments/accept-payments/).
  Paystack also publishes webhook source IPs. IP allow-listing is **not** implemented; signature verification is.
- **Not verified against real Paystack.** All payment tests used a local mock server. A test-mode check with real keys is still required (section 16).

## 11. Environment and setup

`server/.env.example` and `.env.example` contain placeholders only. Real `.env` files are git-ignored.

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection |
| `JWT_SECRET` | yes | at least 32 characters in production (startup refuses otherwise) |
| `CLIENT_URL` | yes in prod | comma-separated allowed browser origins. Requests from other origins get **403**. |
| `APP_URL` | recommended | public frontend URL, used for referral, reset and callback links |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_BASE_URL` | for billing | |
| `SUBSCRIPTION_ENFORCEMENT` | no | default `false` |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM` | for reset email | |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MINUTES` | no | default 20 per 15 minutes |
| `TRUST_PROXY` | behind a proxy | set to `1` so rate limiting sees real client IPs |
| `NODE_ENV`, `PORT` | no | |
| `VITE_API_URL` (frontend) | yes | e.g. `https://api.example.com/api` |

Missing or invalid configuration stops the API at startup with a readable list (exit 1). An unreachable
database also gives a readable message and exit 1 (both verified).

**Deployment status:** the frontend is set up for Vercel (`vercel.json` SPA rewrite). The live site
`afribizula.vercel.app` still serves an old build, and `/login` returns 404 there (checked 2026-10-18). Recent Vercel deployments were
blocked because the commit author lacks access to the Vercel team, so a team member must grant access or deploy. **No API
host exists yet.** Choose one, set the variables, and register the webhook URL in Paystack. I have not verified any production deployment.

## 12. Commands

See the table in the [README](../README.md#commands). The local test stack used by the browser smoke test is in `e2e/README.md`.

## 13. Implemented features and verification

Commands I ran on this branch, with their actual results:

- `npm run lint` (root, covers `src/` and `server/`): **0 problems**.
- `npm run build` (root): **success**.
- `cd server && npm test`: **30 tests, 30 pass, 0 fail**. These run against an in-memory MongoDB (`mongodb-memory-server`) and a mock Paystack HTTP server.
- `node e2e/smoke.mjs` (real React app in headless Chromium, against the real API on an in-memory DB and a mock Paystack): **32 of 32 checks passed, 0 browser console errors**.
- Migration script against an in-memory DB with legacy-shaped users: behaved as described in section 6.
- Startup with missing environment variables or an unreachable DB: readable error and exit 1.

| Feature | Status | Relevant Files | Verification Evidence | Remaining Work |
|---|---|---|---|---|
| Registration (business / ambassador) | Working and verified | `controllers/authController.js`, `Pages/auth/Register.jsx` | auth.test.js; e2e register, validation and referral checks | — |
| Login, session restore, logout | Working and verified | `authController.js`, `context/AuthContext.jsx`, `Pages/auth/Login.jsx` | auth.test.js (safe user, forged and missing tokens); e2e wrong-password and role logins | — |
| No password hash in responses | Working and verified | `models/User.js` (`select:false`, `toSafeJSON`) | auth.test.js asserts no `password` field | — |
| Forgot / reset password | Working and verified (with mail configured) | `authController.js`, `services/mailer.js`, `Pages/auth/ForgotPassword.jsx`, `ResetPassword.jsx` | auth.test.js (JSON mail transport, single-use, expiry); config test 503 without SMTP; e2e confirmation | Configure real SMTP (owner) |
| Change password, forced change for staff | Working and verified | `authController.js`, `Pages/Account.jsx`, `Guards.jsx` | auth.test.js; e2e staff forced change | — |
| Route guards and backend RBAC | Working and verified | `middleware/authMiddleware.js`, `Guards.jsx` | auth/ambassador tests (403 for owner and ambassador on admin routes); e2e redirects | — |
| Suspension (user, business, ambassador) | Working and verified | `adminRoutes.js`, `authMiddleware.js` | auth.test.js; e2e suspended staff signed out | — |
| Rate limiting, CORS allow-list, headers | Working and verified | `app.js`, `routes/authRoutes.js` | config-and-limits.test.js (429; 403 and no account created for a foreign origin) | Set `TRUST_PROXY` in production |
| Guided onboarding | Working and verified | `routes/businessRoutes.js`, `Pages/Onboarding.jsx` | business.test.js (required, validation, ZZ rejected); e2e wizard | — |
| Owner dashboard and checklist | Working and verified | `businessRoutes.js` (`/summary`), `Pages/app/Dashboard.jsx` | e2e dashboard checks | — |
| Departments → Categories → Products | Working and verified | `models/Inventory.js`, `routes/inventoryRoutes.js`, `Pages/app/Inventory.jsx` | business.test.js (hierarchy integrity, isolation); e2e create flow and invalid price | UI cannot rename departments or categories, or move products (API supports PATCH) |
| Stock control | Working and verified | `inventoryRoutes.js`, `salesRoutes.js` | business.test.js (no negative stock, rollback); e2e stock 10 → 8 → 10, oversell refused | — |
| Service businesses | Implemented, partially functional | same | business.test.js (service items without stock) | Bookings not built |
| Sales and voids | Working and verified | `models/Sale.js`, `routes/salesRoutes.js`, `Pages/app/Sales.jsx` | business.test.js (server-side pricing, void); e2e | No receipts or refunds |
| Staff and sales tracking modes | Working and verified | `businessRoutes.js`, `Pages/app/Staff.jsx`, `Settings.jsx` | business.test.js (permissions, off/optional/required); e2e attribution and staff view | — |
| Business settings | Working and verified (API); UI exercised indirectly | `businessRoutes.js`, `Pages/app/Settings.jsx` | business.test.js | Changing currency does not convert existing prices (shown in UI) |
| Subscriptions (Paystack) | Implemented; verified only against a mock | `routes/billingRoutes.js`, `services/paystack.js`, `services/billing.js`, `Pages/app/Billing*.jsx` | ambassador.test.js (verify, webhook idempotency, bad signature 401, amount mismatch); e2e checkout and callback with mock | **Unable to verify without Paystack test keys**; prices unconfirmed |
| Subscription enforcement | Working and verified (off by default) | `authMiddleware.js` | enforcement.test.js (402) | Owner to decide when to enable |
| Ambassador application and approval | Working and verified | `authController.js`, `adminRoutes.js`, `Pages/admin/Ambassadors.jsx` | ambassador.test.js; e2e | — |
| Referral attribution, self-referral and duplicate protection | Working and verified | `authController.js`, `models/Ambassador.js`, `utils/codes.js` | ambassador.test.js (+tag self-referral rejected, pending and suspended codes rejected, unique referral) | Only email-based self-referral detection |
| Commissions (policy-driven) | Working and verified | `services/commissions.js`, `adminRoutes.js` | ambassador.test.js (awaiting policy, 10% → ₦1,000, first-payment basis); e2e | Rate and rules need owner approval |
| Payout recording | Working and verified | `adminRoutes.js`, `Pages/admin/Commissions.jsx`, `Payouts.jsx` | ambassador.test.js (no double payout); e2e payout TRF-001 visible to ambassador | No automated transfers (by design) |
| Ambassador Dashboard | Working and verified | `routes/ambassadorRoutes.js`, `Pages/ambassador/AmbassadorDashboard.jsx` | e2e pending, active, awaiting-policy and paid states | — |
| Admin console | Working and verified | `routes/adminRoutes.js`, `Pages/admin/*` | ambassador.test.js (stats, reset link); e2e overview, users, businesses, payments, audit | No admin creation UI (CLI only, by design) |
| Audit log | Working and verified | `models/System.js`, `adminRoutes.js` | e2e sees `payout.record` | No retention policy |
| Marketing site | Working; copy partly aspirational | `src/Sections/*` | build; e2e home | Owner to approve copy (section 15) |
| Mobile layout of app | Working (spot-checked) | `styles/app.css`, `AppShell.jsx` | e2e mobile check and screenshots at 390px | Full device testing |
| Production deployment | Unable to verify | `vercel.json` | Live site still old build | Vercel access, API host, env vars |

## 14. Limitations and deferred features

- **Deferred (marketing only):** bookings and booking links, commitment payments, invoices, order tracking,
  logistics, B2B marketplace, bulk pricing, supplier management, platform and logistics commissions, newsletter, Google sign-in.
  Pricing now labels these "coming soon".
- No receipts, refunds, discounts, taxes, multi-branch support, product images, CSV import or export, or reports beyond the dashboard.
- Paystack recurring billing, proration and plan downgrades are not implemented.
- Ambassador payouts are manual. There are no payout requests, no clawback, and no multi-currency payout aggregation (admin totals assume NGN).
- One role per account. An ambassador who also owns a business needs a second email.
- The JWT is stored in `localStorage`, so XSS would expose it. React escaping and the absence of `dangerouslySetInnerHTML` reduce this risk. Moving to httpOnly cookies would need CSRF handling.
- No error monitoring and no structured logging.
- The marketing site's Privacy and Terms links were removed because the pages do not exist. Social links appear only once real URLs are set in `Footer.jsx`.

## 15. Owner decisions required

| # | Decision | Current behaviour |
|---|---|---|
| 1 | **Rotate the leaked MongoDB password and JWT secret** (see AUDIT §5); decide whether to purge git history | Not done (requires owner access) |
| 2 | Confirm plan prices (₦6k/₦10k/₦20k vs bizula-app ₦2k) and plan names | Marketing prices, flagged as provisional |
| 3 | Trial or free tier? | None |
| 4 | Should plans gate features? | No gating |
| 5 | When to enable `SUBSCRIPTION_ENFORCEMENT` | Off |
| 6 | Commission type, rate and basis | Not set; commissions wait for it |
| 7 | Payout schedule, minimum and method; refund clawback | Manual, at admin discretion |
| 8 | Ambassador approval criteria and terms | Manual approval |
| 9 | Referral attribution window (currently: sign-up only, browser-session cookie) | As described |
| 10 | Marketing claims: "15% Platform Commission", "Logistics Commission", deferred features | Left as copy; plan features labelled "coming soon" |
| 11 | Privacy Policy and Terms of Service text; social media URLs; contact details | Links hidden |
| 12 | Domain (`afribizula.com` does not resolve) and API host | — |
| 13 | Which Vercel project is canonical (three exist), and Vercel team access for contributors | — |

## 16. Team guide

**Before going live:**
1. Rotate the secrets (decision 1).
2. Create a production MongoDB database and an API host. Set the environment variables (section 11). Run `npm run create-admin`.
3. In Vercel, set `VITE_API_URL` and deploy this branch. Then confirm that `/login` loads (SPA rewrite).
4. Add Paystack **test** keys and run a real test-mode payment end to end: checkout → callback → webhook
   (Paystack dashboard → webhook URL `https://<api>/api/billing/webhook`). Then switch to live keys.
5. Configure SMTP and test forgot-password with a real inbox.
6. Get the owner's decisions in section 15, then set the commission policy in Admin.

**Working on the code:**
- Add an API feature by creating a router in `server/routes/`, mounting it in `app.js`, and protecting it with `protect` + `requireRole`. Use `loadBusiness` for business data and never accept a business id from the client.
- Throw `ApiError` for expected errors. Express 5 forwards async errors to `errorHandler`.
- Validate with `utils/validate.js` `collect()` so field errors reach the forms as `details`.
- Store money as integers in minor units. In the UI, use `lib/format.js` (`toMinor`, `fromMinor`, `formatMoney`).
- In the UI, read with `useFetch(path)` and write with `useAction().run(fn, successMessage)`. Wrap results in `<Loader>` for loading, error and empty states.
- Add a test in `server/test/` for every rule (see `helpers.js` `startStack()`), and run `npm run lint`, `npm run build` and `cd server && npm test` before every PR.
