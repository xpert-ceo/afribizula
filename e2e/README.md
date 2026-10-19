# Browser smoke test

`smoke.mjs` drives the real React app in Chromium through the critical MVP workflows
(32 checks: auth errors, guards, ambassador apply → admin approval → referral sign-up,
onboarding, inventory, staff, sales with stock, Paystack checkout + verification,
commission policy → approval → payout, staff permissions, suspension, sale void, mobile).

It runs against `stack.mjs`: the real Express API on an **in-memory MongoDB** with a
**mock Paystack** server (from `server/test/helpers.js`). No real services are touched.

Playwright is intentionally not a project dependency. To run:

```bash
# 1. one-off: install Playwright somewhere outside the repo, or temporarily
npm i --no-save playwright && npx playwright install chromium

# 2. start the test API (prints its URL; writes e2e/.tmp/stack.json)
cd server && node ../e2e/stack.mjs &

# 3. create the admin used by the test, in the in-memory DB
MONGO_URI=$(node -p 'require("../e2e/.tmp/stack.json").mongo') JWT_SECRET=test-secret-test-secret-test-secret-123 \
  CLIENT_URL=http://localhost:5173 APP_URL=http://localhost:5173 ADMIN_PASSWORD=AdminPass123 \
  node scripts/create-admin.js --email admin@bizula.test
cd ..

# 4. start the web app pointing at it (must be http://localhost:5173 — the CORS allow-list)
VITE_API_URL=$(node -p 'require("./e2e/.tmp/stack.json").base')/api npx vite --port 5173 --host localhost &

# 5. run
node e2e/smoke.mjs
```

Screenshots go to `e2e/.tmp/shots/`. The test expects a fresh stack each run.
