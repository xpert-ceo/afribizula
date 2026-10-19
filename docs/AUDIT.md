# Pre-change audit: xpert-ceo/afribizula

This audit records the state of the repository **before** the MVP work on branch
`mvp/audit-and-completion`. The baseline is commit `79789b7` (tip of `main`; 23 commits;
one branch; no pull requests, issues or forks at audit time).

All findings come from reading the code and git history, running the build, lint and server
locally, and making HTTP requests to the public Vercel URL. I had no access to the Vercel
dashboard, MongoDB Atlas, Paystack, any private deployment or any production data.

Status key: **1** working and verified · **2** implemented but partially functional ·
**3** UI-only or mock · **4** broken · **5** missing · **6** unable to verify without external credentials.

## 1. Build and runtime checks (baseline)

| Check | Result | Evidence |
|---|---|---|
| `npm run build` (root) | **Failed** | `src/Pages/auth/Login.jsx:18` declares `function Login()` *inside* the exported `Login` component. Line 3 imports `signInWithEmailAndPassword` from `"firebase"`, which is not a valid entry point. `auth` is used at line 28 but never imported, and no `src/firebase.js` exists. |
| `npm run lint` (root) | **35 errors** | Unused vars, a nested component, duplicate `border` keys (`Hero.jsx`, `Navbar.jsx`), and `process`/`require` in browser scope |
| `node server/server.js` | **Crashed at start** | `SyntaxError` at `server/server.js:34`: the file tail was duplicated. It also imported `./routes/userRoutes.js`, which did not exist (a copy sat in `server/config/userRoutes.js`). |
| Tests | **None** | No test files or test script |
| `README.md` | Default Vite template | — |

## 2. Feature classification (baseline)

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Marketing site | 1 | `src/Pages/Home.jsx`, `src/Sections/*` | Rendered on https://afribizula.vercel.app (HTTP 200) |
| Login page | 4 | `src/Pages/auth/Login.jsx` | Nested component, missing `auth` import, invalid Firebase import, so the build failed |
| Register page | 3 | `src/Pages/auth/Register.jsx` | Only `onClick` handlers toggled password visibility. The `<Button>` at line 162 had no submit handler and made no API call. |
| Forgot password page | 3 | `src/Pages/auth/ForgotPassword.jsx` | The "Send Reset Link" `<Button>` (line 78) had no handler |
| Google sign-in | 3 | `Login.jsx`, `Register.jsx`, `src/firebaselogin.js`, `server/Firebaseauthadmin.js` | No Firebase config, no `firebase-admin` dependency, no service-account key. The server-side Firebase files were CommonJS inside an ESM package and were never mounted. |
| Register/login API | 2 | `server/controllers/authController.js`, `server/routes/authRoutes.js` | Logic existed, but the server could not start. `loginUser` (line ~115) returned `user` as the full Mongoose document, **including the password hash**. |
| Auth middleware / protected routes | 5 | `server/middleware/authMiddleware.js` | File was empty (0 bytes). There were no protected routes and no RBAC. |
| Roles | 4 | `server/models/User.js:24-34` | `role` enum mixed business types (`service`, `retail`, `enterprise`, `logistics`, `customer`). There were no owner, staff, ambassador or admin roles. |
| Password reset | 2 | `server/config/passwordReset.js` | Not mounted and no mailer. Unreachable. |
| Onboarding | 5 | — | `onboardingCompleted` field only |
| Business dashboard | 5 | — | No routes beyond `/`, `/login`, `/register`, `/forgot-password` (`src/App.jsx`) |
| Inventory (Departments → Categories → Products) | 5 | — | — |
| Sales / staff | 5 | — | — |
| Subscriptions / Paystack | 5 | — | Pricing section only (`src/Sections/Pricing.jsx`) |
| Ambassador dashboard, referrals, commissions, payouts | 5 | — | No model, route, page, component, string or commit mentions ambassadors, referrals or commissions anywhere in this repository's tree or history (searched with `git log -p` and `rg`) |
| Main admin | 5 | — | — |
| Bookings, invoices, commitment payments, logistics, B2B marketplace, bulk pricing, supplier management | 3 | `src/Sections/Solutions.jsx`, `Marketplace.jsx`, `Pricing.jsx`, `Hero.jsx` | Marketing copy only |
| "View Demo", "Explore Marketplace", newsletter "Subscribe", social links | 3 | `Hero.jsx` ~271-320, `Navbar.jsx` mobile menu, `Footer.jsx` ~300-510 | Buttons without handlers; `href="#"`; links to `/privacy` and `/terms` pages that do not exist |
| Frontend API client | 4 | `Api.js` (root), `src/axios.js`, `src/auth.js`, `src/full flow.js` | Three overlapping, unused clients, one with a space in its filename |
| Production deployment | 6 | Vercel | See section 5 |

## 3. Ambassador investigation

As requested, I did not treat the missing route alone as proof that the dashboard did not exist. I checked:

1. **This repository:** the full tree and all 23 commits (`git log --all -p`). No ambassador, referral, commission or payout code, data model or copy exists.
2. **Related repositories under the same owner:**
   - `xpert-ceo/bizula`: static HTML prototypes (onboarding, merchant dashboard, invoice module). No ambassador concept.
   - `xpert-ceo/bizula-v2`: empty.
   - `xpert-ceo/bizula-app` (Next.js 14 / TypeScript): has a **user referral** system (5 days of credit per referral, granted at sign-up, with no self-referral checks), an admin panel (users, sales, analytics), and Paystack at **₦2,000/month with a 7-day trial**. Security issues found there: the session cookie is the raw user `_id` (forgeable), and `app/api/admin/password-recovery/route.ts` contains a hard-coded fallback admin credential. There is no ambassador, commission or payout concept.

**Conclusion:** the Ambassador Dashboard and its backend did not exist in any repository I could access. The only reusable idea was the referral-code pattern in `bizula-app`. I did not port its code because of the security issues above and because its reward model (time credit) differs from ambassador commissions. The new implementation is described in `HANDOVER.md`.

## 4. Contradictions to resolve

| Topic | Source A | Source B |
|---|---|---|
| Pricing | afribizula marketing: Service ₦6,000, Retail ₦10,000, Enterprise ₦20,000 | bizula-app: one plan at ₦2,000/month |
| Trial | Marketing CTA said "Start Free" | No free tier or trial was agreed; bizula-app has a 7-day trial |
| Platform commission | `Solutions.jsx:51` "15% Platform Commission" | No decision exists; not implemented |
| Logistics commission | `Hero.jsx:432` "Logistics Commission" | Logistics is not in the MVP |
| Plan features | Pricing lists bookings, invoices, order tracking, supplier management, B2B marketplace | None are implemented; now labelled "coming soon" |
| Domain | SEO/sitemap use `afribizula.com` | The domain does not resolve (re-checked: no response) |
| Referral reward | bizula-app: time credit for any user | Agreed concept: ambassadors and main-admin control |

## 5. Security and deployment findings

- **Secret exposure (critical, needs owner action).** Commit `91d348b` committed `server/.env` to this **public** repository. It contained a MongoDB Atlas connection string with an embedded password and a `JWT_SECRET`. An earlier commit, `c58d6c1`, contained local values. The values are not reproduced here. The file is now deleted and git-ignored, but **the values remain in git history**. The owner must rotate the Atlas database user's password and use a new `JWT_SECRET` in every environment. Purging history (e.g. `git filter-repo`) is optional, destructive, requires a force-push, and was not done.
- No rate limiting, no security headers, and a permissive CORS configuration.
- Vercel projects found: `afribizula`, `afribizula-f88y`, `afribizula-x57t` (team "xpert's projects"). The most recent deployments failed with "Git author zikaora47-prog must have access to the project on Vercel". That is a team-permission block, not a code error. Earlier, `6dc2bb5` failed to build and `bd894f0` built successfully.
- https://afribizula.vercel.app serves an old build (HTTP 200). `/login` and `/app` return **404** because there is no SPA rewrite (re-checked on 2026-10-18).
- No backend deployment configuration or evidence of a hosted API.
