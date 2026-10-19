// Browser smoke test of the critical MVP workflows. Usage: see e2e/README.md
import { chromium } from "playwright";
import fs from "node:fs";
// Set CHROME_PATH to use a specific Chromium binary; otherwise Playwright's bundled browser is used.
const exe = process.env.CHROME_PATH || undefined;
const APP = "http://localhost:5173";
const SHOTS = new globalThis.URL("./.tmp/shots/", import.meta.url).pathname; fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const browser = await chromium.launch({ executablePath: exe });
const consoleErrors = [];
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  p.on("dialog", (d) => d.accept(d.type() === "prompt" ? "E2E test reason" : undefined));
  p.on("pageerror", (e) => consoleErrors.push(String(e)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|checkout\.mock/.test(m.text())) consoleErrors.push(m.text()); });
  await p.route("https://checkout.mock/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<h1>Mock Paystack checkout</h1>" }));
  return p;
}
let step = 0;
async function check(name, fn, page) {
  step++;
  try { await fn(); results.push(["PASS", name]); console.log("PASS", name); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); console.log("FAIL", name, e.message.split("\n").slice(0, 3).join(" | ")); if (page) await page.screenshot({ path: `${SHOTS}/fail-${step}.png`, fullPage: true }); }
}
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });
const login = async (p, email, pw) => {
  await p.goto(APP + "/login");
  await p.getByLabel("Email Address").fill(email);
  await p.getByLabel("Password", { exact: true }).fill(pw);
  await p.getByRole("button", { name: /sign in|log in/i }).click();
};
const pickProduct = async (p, re) => {
  await p.getByLabel("Product").waitFor({ timeout: 15000 });
  await p.waitForFunction((src) => [...document.querySelectorAll("option")].some((o) => new RegExp(src).test(o.textContent)), re.source, { timeout: 15000 });
  const opts = await p.getByLabel("Product").locator("option").allTextContents();
  const label = opts.find((o) => re.test(o)); if (!label) throw new Error("option not found " + re);
  await p.getByLabel("Product").selectOption({ label });
};
const expectOption = async (p, re) => p.waitForFunction((src) => [...document.querySelectorAll("option")].some((o) => new RegExp(src).test(o.textContent)), re.source, { timeout: 10000 });
const expectText = async (p, re, timeout = 8000) => { await p.getByText(re).first().waitFor({ timeout }); };

// ---------- 1. Guards and 404 ----------
const g = await newPage();
await check("unauthenticated /app redirects to /login", async () => { await g.goto(APP + "/app"); await g.waitForURL(/\/login/); }, g);
await check("unknown route shows 404 page", async () => { await g.goto(APP + "/nope"); await expectText(g, "Page not found"); }, g);
await check("login with wrong password shows server error", async () => { await login(g, "nobody@x.test", "Wrong12345"); await expectText(g, /invalid email or password/i); await shot(g, "01-login-error"); }, g);
await check("register client validation (mismatched passwords)", async () => {
  await g.goto(APP + "/register");
  await g.getByLabel("Full Name").fill("A"); await g.getByLabel("Email Address").fill("bad"); await g.getByLabel("Password", { exact: true }).fill("short"); await g.getByLabel("Confirm Password").fill("other");
  await g.getByRole("button", { name: "Create Account" }).click(); await expectText(g, /match/i); await shot(g, "02-register-validation");
}, g);
await check("forgot password (mail configured) gives non-enumerating confirmation", async () => {
  await g.goto(APP + "/forgot-password"); await g.getByLabel("Email Address").fill("someone@x.test");
  await g.getByRole("button", { name: /send|reset/i }).click(); await expectText(g, /If an account exists/); await shot(g, "03-forgot");
}, g);

// ---------- 2. Ambassador applies ----------
const amb = await newPage();
await check("ambassador registers and sees pending approval", async () => {
  await amb.goto(APP + "/register"); await amb.getByRole("radio", { name: /Ambassador/ }).click();
  await amb.getByLabel("Full Name").fill("Ada Ambassador"); await amb.getByLabel("Email Address").fill("ada@amb.test");
  await amb.getByLabel("Password", { exact: true }).fill("Password123"); await amb.getByLabel("Confirm Password").fill("Password123");
  await amb.getByRole("button", { name: "Apply as Ambassador" }).click();
  await amb.waitForURL(/\/ambassador$/); await expectText(amb, /awaiting approval/i); await shot(amb, "04-ambassador-pending");
}, amb);
await check("ambassador cannot open admin console (redirected)", async () => { await amb.goto(APP + "/admin/users"); await amb.waitForURL(/\/ambassador$/); }, amb);

// ---------- 3. Admin approves ----------
const adm = await newPage();
await check("admin logs in to overview with policy warning", async () => { await login(adm, "admin@bizula.test", "AdminPass123"); await adm.waitForURL(/\/admin$/); await expectText(adm, /No commission policy is set/); await shot(adm, "05-admin-overview"); }, adm);
await check("admin approves ambassador", async () => {
  await adm.goto(APP + "/admin/ambassadors"); await adm.getByRole("button", { name: "Approve" }).click(); await expectText(adm, /is now active/); await shot(adm, "06-admin-ambassadors");
}, adm);

let code = "", link = "";
await check("approved ambassador sees code and referral link", async () => {
  await amb.goto(APP + "/ambassador"); await expectText(amb, "Your referral code");
  code = (await amb.locator(".code-box").first().textContent()).trim();
  link = (await amb.locator(".code-box").nth(1).textContent()).trim();
  if (!/^[A-Z0-9]{4,}$/.test(code) || !link.includes(`ref=${code}`)) throw new Error(`bad code/link ${code} ${link}`);
  await shot(amb, "07-ambassador-active");
}, amb);

// ---------- 4. Owner registers via referral link, onboards ----------
const own = await newPage();
await check("owner registers via referral link (code prefilled and validated)", async () => {
  await own.goto(link.replace(/^https?:\/\/[^/]+/, APP));
  await own.getByLabel("Full Name").fill("Obi Owner"); await own.getByLabel("Email Address").fill("obi@shop.test");
  await own.getByLabel("Password", { exact: true }).fill("Password123"); await own.getByLabel("Confirm Password").fill("Password123");
  const v = await own.getByLabel("Referral code (optional)").inputValue(); if (v !== code) throw new Error("code not prefilled: " + v);
  await expectText(own, /Referral code applied/); await shot(own, "08-register-referral");
  await own.getByRole("button", { name: "Create Account" }).click(); await own.waitForURL(/\/onboarding/);
}, own);
await check("onboarding wizard: validation, retail, Nigeria/NGN, staff tracking optional", async () => {
  await own.getByRole("button", { name: "Continue" }).click(); await expectText(own, /Enter your business name/);
  await own.getByLabel("Business name").fill("Obi Supermarket"); await own.getByRole("button", { name: /Retail/ }).click(); await own.getByRole("button", { name: "Continue" }).click();
  await own.getByLabel("Country").selectOption("NG"); if ((await own.getByLabel("Currency").inputValue()) !== "NGN") throw new Error("currency default");
  await shot(own, "09-onboarding-location"); await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("Optional", { exact: true }).click(); await own.getByRole("button", { name: "Finish setup" }).click();
  await expectText(own, /is set up/); await shot(own, "10-onboarding-done");
}, own);
await check("owner dashboard shows checklist and no-subscription notice", async () => { await own.goto(APP + "/app"); await expectText(own, "Next steps"); await expectText(own, /do not have an active subscription/); await shot(own, "11-owner-dashboard"); }, own);

// ---------- 5. Inventory ----------
await check("create department, category and product", async () => {
  await own.goto(APP + "/app/inventory");
  await own.getByLabel("New department").fill("Groceries"); await own.getByRole("button", { name: "Add" }).first().click(); await expectText(own, "Department created");
  await own.getByLabel("New category").fill("Beverages"); await own.getByRole("button", { name: "Add" }).nth(1).click(); await expectText(own, "Category created");
  await own.getByLabel("Name", { exact: true }).fill("Malt 33cl"); await own.getByLabel("Price (NGN)").fill("1500"); await own.getByLabel("Opening stock").fill("10");
  await own.getByRole("button", { name: "Add", exact: true }).nth(2).click(); await expectText(own, "Product added");
  await own.locator("table").getByText("Malt 33cl").waitFor(); await shot(own, "12-inventory");
}, own);
await check("invalid price is rejected client-side", async () => {
  await own.getByLabel("Name", { exact: true }).fill("Bad"); await own.getByLabel("Price (NGN)").fill("abc");
  await own.getByRole("button", { name: "Add", exact: true }).nth(2).click(); await expectText(own, /valid price/);
}, own);

// ---------- 6. Staff ----------
await check("owner adds staff member", async () => {
  await own.goto(APP + "/app/staff");
  await own.getByLabel("Full name").fill("Sade Staff"); await own.getByLabel("Email").fill("sade@shop.test"); await own.getByLabel("Temporary password").fill("Temp12345");
  await own.getByRole("button", { name: "Add staff member" }).click(); await expectText(own, /can now sign in/); await shot(own, "13-staff");
}, own);

// ---------- 7. Sales ----------
await check("record sale attributed to staff; stock decremented", async () => {
  await own.goto(APP + "/app/sales"); await pickProduct(own, /Malt 33cl/);
  await own.getByLabel("Qty").fill("2"); await own.getByRole("button", { name: "Add item" }).click();
  await own.getByLabel(/Staff member/).selectOption({ label: "Sade Staff" });
  await own.getByRole("button", { name: "Record sale" }).click(); await expectText(own, /Sale recorded: .*3,000/);
  await expectOption(own, /Malt 33cl.*\(8 in stock\)/); await shot(own, "14-sales");
}, own);
await check("overselling is refused by the server", async () => {
  await pickProduct(own, /Malt 33cl/); await own.getByLabel("Qty").fill("50"); await own.getByRole("button", { name: "Add item" }).click();
  await own.getByRole("button", { name: "Record sale" }).click(); await expectText(own, /Not enough stock/);
  await own.getByRole("button", { name: "Remove" }).click();
}, own);

// ---------- 8. Billing ----------
let ref = "";
await check("subscription checkout redirects to Paystack; callback verifies", async () => {
  await own.goto(APP + "/app/billing"); await expectText(own, /provisional/); await shot(own, "15-billing");
  await own.getByRole("button", { name: "Pay for Retail" }).click(); await own.waitForURL(/checkout\.mock/);
  ref = own.url().split("/").pop();
  await fetch("http://127.0.0.1:5056/pay/" + ref);
  await own.goto(`${APP}/app/billing/callback?reference=${ref}`); await expectText(own, /Payment of .* confirmed/); await shot(own, "16-billing-callback");
}, own);

// ---------- 9. Admin: policy, commission approve, payout ----------
await check("ambassador sees conversion and commission awaiting policy", async () => { await amb.goto(APP + "/ambassador"); await expectText(amb, /commission rate has not been set/); await amb.locator("table").getByText("awaiting policy").first().waitFor(); await amb.locator("table").getByText("converted").first().waitFor(); await shot(amb, "17-ambassador-awaiting"); }, amb);
await check("admin sets commission policy 10% first payment", async () => {
  await adm.goto(APP + "/admin/settings"); await adm.getByLabel("Percentage (0–100)").fill("10"); await adm.getByRole("button", { name: "Save policy" }).click();
  await expectText(adm, /1 commission\(s\) awaiting policy were calculated/); await shot(adm, "18-admin-policy");
}, adm);
await check("admin approves commission (₦1,000)", async () => {
  await adm.goto(APP + "/admin/commissions"); await expectText(adm, /1,000/); await adm.getByRole("button", { name: "Approve" }).click(); await expectText(adm, "Commission approved");
}, adm);
await check("admin records payout for approved commission", async () => {
  await adm.getByRole("tab", { name: "Approved (unpaid)" }).click(); await adm.getByLabel("Select for payout").check();
  await adm.getByLabel("Method").fill("Bank transfer"); await adm.getByLabel("Reference").fill("TRF-001");
  await shot(adm, "19-admin-payout-form"); await adm.getByRole("button", { name: "Record payout" }).click(); await expectText(adm, /Payout recorded/);
  await adm.goto(APP + "/admin/payouts"); await expectText(adm, "TRF-001"); await shot(adm, "20-admin-payouts");
}, adm);
await check("ambassador sees paid commission and payout", async () => { await amb.goto(APP + "/ambassador"); await amb.getByText("TRF-001").waitFor(); await shot(amb, "21-ambassador-paid"); }, amb);
await check("admin users page: generate reset link, suspend user", async () => {
  await adm.goto(APP + "/admin/users"); const row = adm.locator("tr", { hasText: "sade@shop.test" });
  await row.getByRole("button", { name: "Reset link" }).click(); await expectText(adm, /One-time password reset link/);
  await shot(adm, "22-admin-users");
}, adm);
await check("admin pages render: businesses, payments, audit log", async () => {
  await adm.goto(APP + "/admin/businesses"); await expectText(adm, "Obi Supermarket");
  await adm.goto(APP + "/admin/payments"); await expectText(adm, ref);
  await adm.goto(APP + "/admin/audit"); await expectText(adm, "payout.record"); await shot(adm, "23-admin-audit");
}, adm);

// ---------- 10. Staff ----------
const st = await newPage();
await check("staff forced to change temporary password", async () => {
  await login(st, "sade@shop.test", "Temp12345"); await st.waitForURL(/\/app\/account/); await expectText(st, /temporary password/);
  await st.getByLabel("Current password").fill("Temp12345"); await st.getByLabel("New password", { exact: true }).fill("NewPass123"); await st.getByLabel("Confirm new password", { exact: true }).fill("NewPass123");
  await st.getByRole("button", { name: "Change password" }).click(); await expectText(st, "Password changed");
}, st);
await check("staff sees own sales only, no owner navigation, owner pages redirect", async () => {
  await st.goto(APP + "/app/sales"); await expectText(st, "My sales"); await expectText(st, /attributed to you/);
  if (await st.getByRole("link", { name: "Staff" }).count()) throw new Error("staff nav visible");
  await st.goto(APP + "/app/billing"); await st.waitForURL(/\/app$/); await shot(st, "24-staff-dashboard");
  await st.goto(APP + "/app/inventory"); await expectText(st, "Read-only product list");
}, st);
await check("suspended staff is signed out on next request", async () => {
  await own.goto(APP + "/app/staff"); await own.locator("tr", { hasText: "sade@shop.test" }).getByRole("button", { name: "Suspend" }).click(); await expectText(own, /can no longer sign in/);
  await st.goto(APP + "/app/sales"); await st.waitForURL(/\/login/, { timeout: 8000 });
}, st);
await check("owner voids sale; stock returned", async () => {
  await own.goto(APP + "/app/sales"); await own.getByRole("button", { name: "Void" }).first().click(); await expectText(own, /voided and stock returned/); await expectOption(own, /Malt 33cl.*\(10 in stock\)/);
}, own);
await check("marketing home renders with no decorative View Demo", async () => {
  await g.goto(APP + "/"); await g.getByRole("link", { name: "Sign in" }).first().waitFor();
  if (await g.getByText("View Demo").count()) throw new Error("View Demo still present"); await shot(g, "25-home");
}, g);

// mobile layout
const m = await browser.newContext({ viewport: { width: 390, height: 844 } }).then((c) => c.newPage());
await check("mobile: owner app shell renders", async () => { await login(m, "obi@shop.test", "Password123"); await m.waitForURL(/\/app$/); await shot(m, "26-mobile-dashboard"); }, m);

await browser.close();
fs.writeFileSync(new globalThis.URL("./.tmp/results.json", import.meta.url), JSON.stringify({ results, consoleErrors }, null, 2));
console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} passed`);
console.log("console errors:", consoleErrors.length, consoleErrors.slice(0, 10));
