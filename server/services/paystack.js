// Thin Paystack client. Behaviour follows Paystack's public docs:
//  - POST /transaction/initialize with amount in the currency subunit
//  - GET  /transaction/verify/:reference — data.status === "success" means paid
//  - webhooks carry x-paystack-signature = HMAC-SHA512(raw body, secret key)
import crypto from "node:crypto";
import ApiError from "../utils/ApiError.js";

export function paystackConfigured(config) {
  return Boolean(config.paystack.secretKey);
}

async function call(config, path, init = {}) {
  if (!paystackConfigured(config)) throw ApiError.unavailable("Payments are not configured on this server yet.");
  let res;
  try {
    res = await fetch(`${config.paystack.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new ApiError(502, `Could not reach the payment provider (${e.name}). Please try again.`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== true) {
    throw new ApiError(502, `Payment provider error: ${body.message || res.status}`);
  }
  return body.data;
}

export const initializeTransaction = (config, payload) =>
  call(config, "/transaction/initialize", { method: "POST", body: JSON.stringify(payload) });

export const verifyTransaction = (config, reference) =>
  call(config, `/transaction/verify/${encodeURIComponent(reference)}`);

export function validWebhookSignature(config, rawBody, signature) {
  if (!paystackConfigured(config) || !signature || !rawBody) return false;
  const expected = crypto.createHmac("sha512", config.paystack.secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
