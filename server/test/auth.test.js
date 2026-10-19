import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./helpers.js";
import { sentMail } from "../services/mailer.js";
import { loadConfig, ConfigError } from "../config/env.js";

let s;
before(async () => { s = await startStack(); });
after(async () => { await s.stop(); });

test("config: missing variables produce a readable error", () => {
  assert.throws(() => loadConfig({}), (e) => e instanceof ConfigError && /MONGO_URI/.test(e.message) && /JWT_SECRET/.test(e.message));
  assert.throws(() => loadConfig({ NODE_ENV: "production", MONGO_URI: "x", JWT_SECRET: "short", CLIENT_URL: "https://a" }), /at least 32/);
});

test("health endpoint reports database state", async () => {
  const r = await s.api("GET", "/api/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { status: "ok", db: "connected" });
});

test("register validates input", async () => {
  const r = await s.api("POST", "/api/auth/register", { body: { name: "", email: "bad", password: "short" } });
  assert.equal(r.status, 400);
  assert.ok(r.body.details.name && r.body.details.email && r.body.details.password);
  const r2 = await s.api("POST", "/api/auth/register", { body: "{not json", raw: "{not json", headers: { "Content-Type": "application/json" } });
  assert.equal(r2.status, 400);
  assert.equal(r2.body.message, "Malformed JSON body");
});

test("register + login return a token and a safe user (no password hash)", async () => {
  const reg = await s.api("POST", "/api/auth/register", { body: { name: "Ada Obi", email: "Ada@Example.com", password: "Password123" } });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.user.email, "ada@example.com");
  assert.equal(reg.body.user.role, "owner");
  assert.equal(reg.body.user.onboardingCompleted, false);
  assert.equal(reg.body.user.password, undefined);

  const dup = await s.api("POST", "/api/auth/register", { body: { name: "Ada", email: "ada@example.com", password: "Password123" } });
  assert.equal(dup.status, 409);

  const bad = await s.api("POST", "/api/auth/login", { body: { email: "ada@example.com", password: "wrongpass1" } });
  assert.equal(bad.status, 401);
  const unknown = await s.api("POST", "/api/auth/login", { body: { email: "nobody@example.com", password: "Password123" } });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.message, bad.body.message, "same message for unknown email and wrong password");

  const ok = await s.api("POST", "/api/auth/login", { body: { email: "ADA@example.com", password: "Password123" } });
  assert.equal(ok.status, 200);
  const serialized = JSON.stringify(ok.body);
  assert.ok(!serialized.includes("password\""), "no password field");
  assert.ok(!/\$2[aby]\$/.test(serialized), "no bcrypt hash anywhere in response");

  const me = await s.api("GET", "/api/auth/me", { token: ok.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "ada@example.com");
});

test("protected routes reject missing, malformed and forged tokens", async () => {
  assert.equal((await s.api("GET", "/api/auth/me")).status, 401);
  assert.equal((await s.api("GET", "/api/auth/me", { token: "garbage" })).status, 401);
  const forged = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: "x", role: "admin" })).toString("base64url") + ".";
  assert.equal((await s.api("GET", "/api/admin/stats", { token: forged })).status, 401);
});

test("ordinary users cannot use admin or ambassador APIs", async () => {
  const o = await s.owner("plain@example.com");
  assert.equal((await s.api("GET", "/api/admin/stats", { token: o.token })).status, 403);
  assert.equal((await s.api("GET", "/api/admin/users", { token: o.token })).status, 403);
  assert.equal((await s.api("PUT", "/api/admin/settings/commission-policy", { token: o.token, body: { type: "percent", value: 50, basis: "every_payment" } })).status, 403);
  assert.equal((await s.api("GET", "/api/ambassador/me", { token: o.token })).status, 403);
});

test("suspended users are blocked immediately, even with a valid token", async () => {
  const o = await s.owner("suspend-me@example.com");
  const adminToken = await s.admin("admin-suspend@bizula.test");
  const r = await s.api("PATCH", `/api/admin/users/${o.user._id}/status`, { token: adminToken, body: { status: "suspended" } });
  assert.equal(r.status, 200);
  assert.equal((await s.api("GET", "/api/business/summary", { token: o.token })).status, 403);
  assert.equal((await s.api("POST", "/api/auth/login", { body: { email: "suspend-me@example.com", password: "Password123" } })).status, 403);
});

test("forgot/reset password: generic response, one-time token, old sessions invalidated", async () => {
  const reg = await s.register({ name: "Reset Me", email: "reset@example.com" });
  const unknown = await s.api("POST", "/api/auth/forgot-password", { body: { email: "ghost@example.com" } });
  const known = await s.api("POST", "/api/auth/forgot-password", { body: { email: "reset@example.com" } });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  assert.equal(unknown.body.message, known.body.message);

  const mail = sentMail.find((m) => m.to === "reset@example.com");
  assert.ok(mail, "reset email sent");
  const token = mail.text.match(/token=([a-f0-9]{64})/)[1];

  assert.equal((await s.api("POST", "/api/auth/reset-password", { body: { token, password: "weak" } })).status, 400);
  await new Promise((r) => setTimeout(r, 1100)); // so the new passwordChangedAt is strictly after the old token's iat
  const ok = await s.api("POST", "/api/auth/reset-password", { body: { token, password: "NewPassword456" } });
  assert.equal(ok.status, 200);
  assert.equal((await s.api("POST", "/api/auth/reset-password", { body: { token, password: "NewPassword789" } })).status, 400, "token is single-use");
  assert.equal((await s.api("GET", "/api/auth/me", { token: reg.token })).status, 401, "old token invalidated");
  assert.equal((await s.api("POST", "/api/auth/login", { body: { email: "reset@example.com", password: "NewPassword456" } })).status, 200);
});

test("change password requires the current password", async () => {
  const reg = await s.register({ name: "Changer", email: "change@example.com" });
  const bad = await s.api("POST", "/api/auth/change-password", { token: reg.token, body: { currentPassword: "nope", newPassword: "Another123" } });
  assert.equal(bad.status, 400);
  const ok = await s.api("POST", "/api/auth/change-password", { token: reg.token, body: { currentPassword: "Password123", newPassword: "Another123" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
});

test("unknown routes return JSON 404", async () => {
  const r = await s.api("GET", "/api/does-not-exist");
  assert.equal(r.status, 404);
  assert.match(r.body.message, /Route not found/);
});
