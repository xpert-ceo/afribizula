// /api/billing — monthly subscriptions via Paystack.
import express from "express";
import Payment from "../models/Payment.js";
import Business from "../models/Business.js";
import { PLANS, getPlan, BILLING_INTERVAL } from "../config/plans.js";
import { protect, requireRole, loadBusiness } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { str } from "../utils/validate.js";
import { randomCode } from "../utils/codes.js";
import { paystackConfigured, initializeTransaction, verifyTransaction, validWebhookSignature } from "../services/paystack.js";
import { applyVerifiedTransaction } from "../services/billing.js";

export const publicPlans = () => Object.values(PLANS);

export function billingRoutes(config) {
  const router = express.Router();
  router.use(protect(config), loadBusiness());

  router.get("/", async (req, res) => {
    const payments = await Payment.find({ business: req.business._id, status: { $ne: "initialized" } })
      .select("plan amount currency status reference paidAt periodStart periodEnd createdAt failureReason")
      .sort({ createdAt: -1 }).limit(24).lean();
    res.json({
      plans: publicPlans(),
      interval: BILLING_INTERVAL,
      subscription: req.business.subscriptionView(),
      paymentsEnabled: paystackConfigured(config),
      enforcement: config.subscriptionEnforcement,
      payments,
    });
  });

  router.post("/checkout", requireRole("owner"), async (req, res) => {
    const plan = getPlan(req.body?.plan);
    if (!plan) throw ApiError.badRequest("Validation failed", { plan: "Choose a valid plan" });
    if (!paystackConfigured(config)) throw ApiError.unavailable("Online payments are not configured yet. Please contact Bizula support.");

    const reference = `BZ-${Date.now().toString(36).toUpperCase()}-${randomCode(6)}`;
    const payment = await Payment.create({
      business: req.business._id, user: req.user._id, plan: plan.id,
      amount: plan.amount, currency: plan.currency, reference,
    });
    try {
      const data = await initializeTransaction(config, {
        email: req.user.email,
        amount: plan.amount,
        currency: plan.currency,
        reference,
        callback_url: `${config.appUrl}/app/billing/callback`,
        metadata: { businessId: String(req.business._id), plan: plan.id, paymentId: String(payment._id) },
      });
      res.status(201).json({ authorizationUrl: data.authorization_url, reference });
    } catch (e) {
      payment.status = "failed";
      payment.failureReason = "Initialization failed";
      await payment.save();
      throw e;
    }
  });

  // Called by the frontend after Paystack redirects back with ?reference=...
  router.get("/verify", requireRole("owner"), async (req, res) => {
    const reference = str(req.query.reference);
    if (!reference) throw ApiError.badRequest("reference is required");
    const payment = await Payment.findOne({ reference, business: req.business._id });
    if (!payment) throw ApiError.notFound("Payment not found for this business");

    if (payment.status === "initialized") {
      const tx = await verifyTransaction(config, reference);
      const result = await applyVerifiedTransaction(tx, "verify");
      if (!result.ok && result.reason !== "unknown_reference") {
        const fresh = await Payment.findById(payment._id);
        return res.status(402).json({ message: "Payment was not successful", status: fresh.status, reason: fresh.failureReason });
      }
    }
    const fresh = await Payment.findById(payment._id).select("plan amount currency status reference paidAt periodEnd failureReason");
    const business = await Business.findById(req.business._id);
    res.json({ payment: fresh, subscription: business.subscriptionView() });
  });

  return router;
}

// Mounted separately with a raw body parser so the HMAC can be checked.
export function billingWebhook(config) {
  const router = express.Router();
  router.post("/", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!validWebhookSignature(config, raw, req.headers["x-paystack-signature"]))
      return res.status(401).json({ message: "Invalid signature" });

    let event;
    try { event = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ message: "Malformed JSON" }); }

    if (event?.event === "charge.success" && event.data?.reference) {
      // Defence in depth: re-verify with the provider instead of trusting the payload.
      const tx = await verifyTransaction(config, String(event.data.reference));
      await applyVerifiedTransaction(tx, "webhook");
    }
    res.status(200).json({ received: true });
  });
  return router;
}
