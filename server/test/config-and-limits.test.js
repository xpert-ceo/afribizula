import { test, before, after } from "node:test";
import User from "../models/User.js";
import assert from "node:assert/strict";
import { startStack } from "./helpers.js";

let s;
before(async () => { s = await startStack({ AUTH_RATE_LIMIT_MAX: "3", MAIL_TRANSPORT: "", SMTP_HOST: "", PAYSTACK_SECRET_KEY: "" }); });
after(async () => { await s.stop(); });

test("forgot-password is honest when email is not configured (503, no fake success)", async () => {
  const r = await s.api("POST", "/api/auth/forgot-password", { body: { email: "a@example.com" } });
  assert.equal(r.status, 503);
  assert.match(r.body.message, /not available/);
});

test("checkout is refused with a clear message when Paystack is not configured", async () => {
  // uses 1 of the 3 auth requests
  const o = await s.owner("nopay@example.com");
  const billing = await s.api("GET", "/api/billing", { token: o.token });
  assert.equal(billing.status, 200);
  assert.equal(billing.body.paymentsEnabled, false);
  const r = await s.api("POST", "/api/billing/checkout", { token: o.token, body: { plan: "retail" } });
  assert.equal(r.status, 503);
});

test("auth endpoints are rate limited", async () => {
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await s.api("POST", "/api/auth/login", { body: { email: "x@example.com", password: "Password123" } })).status);
  assert.ok(codes.includes(429), `expected a 429, got ${codes}`);
});

test("CORS only allows configured origins", async () => {
  const ok = await s.api("GET", "/api/public/plans", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const evil = await s.api("GET", "/api/public/plans", { headers: { Origin: "https://evil.example" } });
  assert.equal(evil.headers.get("access-control-allow-origin"), null);
  assert.equal(evil.status, 403);
  // A request from a disallowed browser origin must not be processed at all.
  const reg = await s.api("POST", "/api/auth/register", {
    headers: { Origin: "https://evil.example" },
    body: { name: "Evil", email: "evil-origin@x.test", password: "Password123" },
  });
  assert.equal(reg.status, 403);
  assert.equal(await User.exists({ email: "evil-origin@x.test" }), null, "account must not have been created");
});

test("public plans expose the three monthly tiers flagged as unconfirmed", async () => {
  const r = await s.api("GET", "/api/public/plans");
  assert.equal(r.body.interval, "monthly");
  assert.deepEqual(r.body.plans.map((p) => p.id), ["service", "retail", "enterprise"]);
  assert.ok(r.body.plans.every((p) => p.priceConfirmed === false));
});
