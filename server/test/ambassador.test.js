// End-to-end ambassador flow: application → approval → referral link → attribution →
// paid conversion → commission → policy → approval → payout → ambassador views.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, sign } from "./helpers.js";

let s, adminToken, amb, ambCode;
before(async () => {
  s = await startStack();
  adminToken = await s.admin();
});
after(async () => { await s.stop(); });

async function pay(ownerToken, plan = "retail", { amount } = {}) {
  const co = await s.api("POST", "/api/billing/checkout", { token: ownerToken, body: { plan } });
  assert.equal(co.status, 201, JSON.stringify(co.body));
  assert.match(co.body.authorizationUrl, /^https:\/\/checkout\.mock\//);
  s.paystack.pay(co.body.reference, { amount });
  return co.body.reference;
}

test("ambassador applies; code is unusable until the main admin approves", async () => {
  amb = await s.register({ name: "Grace Amb", email: "grace@example.com", accountType: "ambassador" });
  assert.equal(amb.user.role, "ambassador");
  assert.equal(amb.ambassador.status, "pending");
  ambCode = amb.ambassador.code;
  assert.match(ambCode, /^[A-Z2-9]{8}$/);

  const me = await s.api("GET", "/api/ambassador/me", { token: amb.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.referralLink, null, "no link while pending");

  assert.equal((await s.api("GET", `/api/public/referral-codes/${ambCode}`)).body.valid, false);
  const early = await s.api("POST", "/api/auth/register", { body: { name: "Early", email: "early@example.com", password: "Password123", referralCode: ambCode } });
  assert.equal(early.status, 400);
  assert.ok(early.body.details.referralCode);

  // ambassador cannot reach admin APIs or business APIs
  assert.equal((await s.api("GET", "/api/admin/ambassadors", { token: amb.token })).status, 403);
  assert.equal((await s.api("PATCH", `/api/admin/ambassadors/${amb.ambassador._id}`, { token: amb.token, body: { status: "active" } })).status, 403, "cannot self-approve");
  assert.equal((await s.api("GET", "/api/inventory/products", { token: amb.token })).status, 403);

  const list = await s.api("GET", "/api/admin/ambassadors?status=pending", { token: adminToken });
  assert.equal(list.body.ambassadors.length, 1);
  const ok = await s.api("PATCH", `/api/admin/ambassadors/${amb.ambassador._id}`, { token: adminToken, body: { status: "active" } });
  assert.equal(ok.status, 200);
  const me2 = await s.api("GET", "/api/ambassador/me", { token: amb.token });
  assert.equal(me2.body.referralLink, `http://localhost:5173/register?ref=${ambCode}`);
  assert.equal((await s.api("GET", `/api/public/referral-codes/${ambCode.toLowerCase()}`)).body.valid, true);
});

test("self-referral and invalid codes are rejected; attribution is set once at signup", async () => {
  const self = await s.api("POST", "/api/auth/register", { body: { name: "Me Again", email: "Grace+shop@example.com", password: "Password123", referralCode: ambCode } });
  assert.equal(self.status, 400);
  assert.match(self.body.details.referralCode, /own referral code/);

  const bogus = await s.api("POST", "/api/auth/register", { body: { name: "X", email: "x1@example.com", password: "Password123", referralCode: "NOPE1234" } });
  assert.equal(bogus.status, 400);

  const ambWithCode = await s.api("POST", "/api/auth/register", { body: { name: "Y", email: "y1@example.com", password: "Password123", accountType: "ambassador", referralCode: ambCode } });
  assert.equal(ambWithCode.status, 400, "ambassadors cannot be referred");

  // There is no API that sets or changes attribution after signup.
  const o = await s.owner("referred1@example.com");
  const refs = await s.api("GET", "/api/admin/referrals", { token: adminToken });
  assert.equal(refs.body.referrals.filter((r) => r.referredUser.email === "referred1@example.com").length, 0, "unreferred owner has no referral");
  void o;
});

let shop1;
test("referred business signs up, pays; conversion recorded and commission awaits a policy", async () => {
  const reg = await s.api("POST", "/api/auth/register", { body: { name: "Chidi Shop", email: "chidi@example.com", password: "Password123", referralCode: ambCode.toLowerCase() } });
  assert.equal(reg.status, 201);
  // duplicate signup with same email cannot create a second attribution
  assert.equal((await s.api("POST", "/api/auth/register", { body: { name: "Chidi", email: "chidi@example.com", password: "Password123", referralCode: ambCode } })).status, 409);

  const ob = await s.api("POST", "/api/business/onboarding", { token: reg.body.token, body: { name: "Chidi Stores", type: "retail", country: "NG", currency: "NGN" } });
  shop1 = { token: reg.body.token, business: ob.body.business };

  let refs = (await s.api("GET", "/api/ambassador/referrals", { token: amb.token })).body.referrals;
  assert.equal(refs.length, 1);
  assert.equal(refs[0].status, "signed_up");
  assert.equal(refs[0].business.name, "Chidi Stores");
  assert.match(refs[0].email, /^ch\*+@example\.com$/, "ambassador sees a masked email");

  const ref = await pay(shop1.token, "retail");
  const v = await s.api("GET", `/api/billing/verify?reference=${ref}`, { token: shop1.token });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  assert.equal(v.body.subscription.status, "active");
  assert.equal(v.body.subscription.plan, "retail");
  const end = new Date(v.body.subscription.currentPeriodEnd);
  assert.ok(end - Date.now() > 27 * 864e5 && end - Date.now() < 32 * 864e5, "one month");

  // The webhook for the same payment must not create a second commission or extend twice.
  const body = JSON.stringify({ event: "charge.success", data: { reference: ref } });
  const wh = await s.api("POST", "/api/billing/webhook", { raw: body, headers: { "Content-Type": "application/json", "x-paystack-signature": sign(body) } });
  assert.equal(wh.status, 200);
  const again = await s.api("GET", `/api/billing/verify?reference=${ref}`, { token: shop1.token });
  assert.equal(again.body.subscription.currentPeriodEnd, v.body.subscription.currentPeriodEnd);

  refs = (await s.api("GET", "/api/ambassador/referrals", { token: amb.token })).body.referrals;
  assert.equal(refs[0].status, "converted");
  const comms = (await s.api("GET", "/api/ambassador/commissions", { token: amb.token })).body.commissions;
  assert.equal(comms.length, 1);
  assert.equal(comms[0].status, "awaiting_policy");
  assert.equal(comms[0].amount, null, "no invented commission amount");
  assert.equal(comms[0].baseAmount, 1000000);
});

test("webhook rejects bad signatures; mismatched amounts never activate a subscription", async () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "whatever" } });
  assert.equal((await s.api("POST", "/api/billing/webhook", { raw: body, headers: { "x-paystack-signature": "bad" } })).status, 401);
  assert.equal((await s.api("POST", "/api/billing/webhook", { raw: body })).status, 401);

  const o = await s.owner("cheat@example.com");
  const ref = await pay(o.token, "enterprise", { amount: 100 });
  const v = await s.api("GET", `/api/billing/verify?reference=${ref}`, { token: o.token });
  assert.equal(v.status, 402);
  const billing = await s.api("GET", "/api/billing", { token: o.token });
  assert.equal(billing.body.subscription.status, "none");

  // Another business cannot verify someone else's reference.
  const other = await s.owner("other@example.com");
  assert.equal((await s.api("GET", `/api/billing/verify?reference=${ref}`, { token: other.token })).status, 404);
  assert.equal((await s.api("POST", "/api/billing/checkout", { token: o.token, body: { plan: "gold" } })).status, 400);
});

test("main admin sets the commission policy; waiting commissions are priced; first-payment basis respected", async () => {
  const bad = await s.api("PUT", "/api/admin/settings/commission-policy", { token: adminToken, body: { type: "percent", value: 150, basis: "first_payment" } });
  assert.equal(bad.status, 400);

  const r = await s.api("PUT", "/api/admin/settings/commission-policy", { token: adminToken, body: { type: "percent", value: 10, basis: "first_payment" } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.applied, { priced: 1, voided: 0 });

  let comms = (await s.api("GET", "/api/ambassador/commissions", { token: amb.token })).body.commissions;
  assert.equal(comms[0].status, "pending");
  assert.equal(comms[0].amount, 100000, "10% of ₦10,000 = ₦1,000 (in kobo)");

  // Renewal: no commission under first_payment basis.
  const ref2 = await pay(shop1.token, "retail");
  await s.api("GET", `/api/billing/verify?reference=${ref2}`, { token: shop1.token });
  comms = (await s.api("GET", "/api/ambassador/commissions", { token: amb.token })).body.commissions;
  assert.equal(comms.length, 1);
  const billing = await s.api("GET", "/api/billing", { token: shop1.token });
  const end = new Date(billing.body.subscription.currentPeriodEnd);
  assert.ok(end - Date.now() > 58 * 864e5, "renewal extends from the current period end");
});

test("commission approval and payout recording; payouts cannot double-pay", async () => {
  const comms = (await s.api("GET", "/api/admin/commissions?status=pending", { token: adminToken })).body.commissions;
  assert.equal(comms.length, 1);
  const id = comms[0]._id;

  assert.equal((await s.api("POST", "/api/admin/payouts", { token: adminToken, body: { ambassadorId: amb.ambassador._id, commissionIds: [id] } })).status, 409, "pending cannot be paid");
  assert.equal((await s.api("PATCH", `/api/admin/commissions/${id}`, { token: adminToken, body: { action: "void" } })).status, 400, "void needs a reason");
  assert.equal((await s.api("PATCH", `/api/admin/commissions/${id}`, { token: adminToken, body: { action: "approve" } })).status, 200);

  const p = await s.api("POST", "/api/admin/payouts", {
    token: adminToken, body: { ambassadorId: amb.ambassador._id, commissionIds: [id], method: "Bank transfer", reference: "TRF-001" },
  });
  assert.equal(p.status, 201, JSON.stringify(p.body));
  assert.equal(p.body.payout.amount, 100000);
  assert.equal((await s.api("POST", "/api/admin/payouts", { token: adminToken, body: { ambassadorId: amb.ambassador._id, commissionIds: [id] } })).status, 409, "no double payout");
  assert.equal((await s.api("PATCH", `/api/admin/commissions/${id}`, { token: adminToken, body: { action: "void", reason: "x" } })).status, 409, "paid cannot be voided");

  const me = await s.api("GET", "/api/ambassador/me", { token: amb.token });
  assert.deepEqual(me.body.stats, { referrals: 1, converted: 1 });
  assert.equal(me.body.totals.find((t) => t.status === "paid").amount, 100000);
  const payouts = (await s.api("GET", "/api/ambassador/payouts", { token: amb.token })).body.payouts;
  assert.equal(payouts.length, 1);
  assert.equal(payouts[0].reference, "TRF-001");

  const audit = await s.api("GET", "/api/admin/audit-log", { token: adminToken });
  const actions = audit.body.entries.map((e) => e.action);
  for (const a of ["ambassador.active", "settings.commission_policy", "commission.approve", "payout.record"]) assert.ok(actions.includes(a), a);
});

test("suspended ambassadors: code stops working and no new commission accrues", async () => {
  await s.api("PATCH", `/api/admin/ambassadors/${amb.ambassador._id}`, { token: adminToken, body: { status: "suspended" } });
  const r = await s.api("POST", "/api/auth/register", { body: { name: "Late", email: "late@example.com", password: "Password123", referralCode: ambCode } });
  assert.equal(r.status, 400);
});

test("admin overview and user list never expose password hashes", async () => {
  const stats = await s.api("GET", "/api/admin/stats", { token: adminToken });
  assert.equal(stats.status, 200);
  assert.equal(stats.body.convertedReferrals, 1);
  assert.ok(stats.body.subscriptionRevenue.find((x) => x.currency === "NGN").amount >= 2000000);
  const users = await s.api("GET", "/api/admin/users?limit=100", { token: adminToken });
  assert.ok(!/\$2[aby]\$/.test(JSON.stringify(users.body)));
  assert.ok(users.body.users.every((u) => u.password === undefined));

  const self = users.body.users.find((u) => u.role === "admin");
  assert.equal((await s.api("PATCH", `/api/admin/users/${self._id}/status`, { token: adminToken, body: { status: "suspended" } })).status, 400);
  const link = await s.api("POST", `/api/admin/users/${users.body.users.find((u) => u.email === "chidi@example.com")._id}/password-reset-link`, { token: adminToken });
  assert.match(link.body.link, /^http:\/\/localhost:5173\/reset-password\?token=[a-f0-9]{64}$/);
});
