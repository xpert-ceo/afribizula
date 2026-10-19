import http from "node:http";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { loadConfig } from "../config/env.js";
import { connectDB } from "../config/db.js";
import { createApp } from "../app.js";
import User from "../models/User.js";

export const PAYSTACK_SECRET = "sk_test_mock_secret_for_tests_only";

/** Minimal Paystack stand-in implementing the two endpoints we call. */
export async function startMockPaystack() {
  const txs = new Map(); // reference -> { amount, currency, status, metadata }
  const server = http.createServer(async (req, res) => {
    const auth = req.headers.authorization;
    const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
    if (auth !== `Bearer ${PAYSTACK_SECRET}`) return send(401, { status: false, message: "Invalid key" });
    let raw = "";
    for await (const c of req) raw += c;
    if (req.method === "POST" && req.url === "/transaction/initialize") {
      const b = JSON.parse(raw);
      txs.set(b.reference, { amount: b.amount, currency: b.currency, status: "abandoned", metadata: b.metadata, email: b.email });
      return send(200, { status: true, data: { authorization_url: `https://checkout.mock/${b.reference}`, reference: b.reference } });
    }
    const m = req.url.match(/^\/transaction\/verify\/(.+)$/);
    if (req.method === "GET" && m) {
      const ref = decodeURIComponent(m[1]);
      const t = txs.get(ref);
      if (!t) return send(404, { status: false, message: "Transaction reference not found" });
      return send(200, { status: true, data: { reference: ref, status: t.status, amount: t.paidAmount ?? t.amount, currency: t.currency, paid_at: new Date().toISOString(), metadata: t.metadata } });
    }
    send(404, { status: false, message: "not found" });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    txs,
    pay(ref, { amount } = {}) { const t = txs.get(ref); t.status = "success"; if (amount !== undefined) t.paidAmount = amount; },
    fail(ref) { txs.get(ref).status = "failed"; },
    close: () => new Promise((r) => server.close(r)),
  };
}

export function sign(body) {
  return crypto.createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
}

export async function startStack(envOverrides = {}) {
  const mongo = await MongoMemoryServer.create();
  const paystack = await startMockPaystack();
  const config = loadConfig({
    NODE_ENV: "test",
    MONGO_URI: mongo.getUri(),
    JWT_SECRET: "test-secret-test-secret-test-secret-123",
    CLIENT_URL: "http://localhost:5173",
    APP_URL: "http://localhost:5173",
    PAYSTACK_SECRET_KEY: PAYSTACK_SECRET,
    PAYSTACK_BASE_URL: paystack.url,
    MAIL_TRANSPORT: "json",
    AUTH_RATE_LIMIT_MAX: "1000",
    ...envOverrides,
  });
  await connectDB(config.mongoUri);
  const app = createApp(config);
  const server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, { token, body, headers = {}, raw } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && !raw ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  }

  async function register(data) {
    const r = await api("POST", "/api/auth/register", { body: { password: "Password123", ...data } });
    if (r.status !== 201) throw new Error(`register failed ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  }

  async function owner(email, onboarding = {}) {
    const s = await register({ name: "Owner " + email, email });
    const ob = await api("POST", "/api/business/onboarding", {
      token: s.token, body: { name: "Shop " + email, type: "retail", country: "NG", currency: "NGN", ...onboarding },
    });
    if (ob.status !== 201) throw new Error("onboarding failed " + JSON.stringify(ob.body));
    return { token: s.token, user: ob.body.user, business: ob.body.business };
  }

  async function admin(email = "admin@bizula.test") {
    await User.create({ name: "Admin", email, password: await bcrypt.hash("AdminPass123", 4), role: "admin", onboardingCompleted: true });
    const r = await api("POST", "/api/auth/login", { body: { email, password: "AdminPass123" } });
    return r.body.token;
  }

  async function stop() {
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    await mongo.stop();
    await paystack.close();
  }

  return { api, register, owner, admin, stop, config, paystack, base };
}
