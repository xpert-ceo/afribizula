// /api/ambassador — the signed-in ambassador's own data only.
import express from "express";
import { Ambassador, Referral, Commission, Payout } from "../models/Ambassador.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { str } from "../utils/validate.js";
import { getPolicy } from "../services/commissions.js";

const maskEmail = (e = "") => {
  const [l, d] = e.split("@");
  return l ? `${l.slice(0, 2)}${"*".repeat(Math.max(1, l.length - 2))}@${d}` : "";
};

export async function commissionTotals(match) {
  const rows = await Commission.aggregate([
    { $match: match },
    { $group: { _id: { status: "$status", currency: "$currency" }, amount: { $sum: { $ifNull: ["$amount", 0] } }, count: { $sum: 1 } } },
  ]);
  return rows.map((r) => ({ status: r._id.status, currency: r._id.currency, amount: r.amount, count: r.count }));
}

export default function ambassadorRoutes(config) {
  const router = express.Router();
  router.use(protect(config), requireRole("ambassador"));

  router.use(async (req, _res, next) => {
    const amb = await Ambassador.findOne({ user: req.user._id });
    if (!amb) throw ApiError.notFound("Ambassador profile not found. Contact support.");
    req.ambassador = amb;
    next();
  });

  router.get("/me", async (req, res) => {
    const a = req.ambassador;
    const [referrals, converted, totals, policy] = await Promise.all([
      Referral.countDocuments({ ambassador: a._id }),
      Referral.countDocuments({ ambassador: a._id, status: "converted" }),
      commissionTotals({ ambassador: a._id }),
      getPolicy(),
    ]);
    res.json({
      ambassador: { _id: a._id, code: a.code, status: a.status, approvedAt: a.approvedAt, payoutDetails: a.payoutDetails || "" },
      referralLink: a.status === "active" ? `${config.appUrl}/register?ref=${a.code}` : null,
      stats: { referrals, converted },
      totals,
      policy,
    });
  });

  router.patch("/me", async (req, res) => {
    const payoutDetails = str(req.body?.payoutDetails);
    if (payoutDetails.length > 500) throw ApiError.badRequest("Validation failed", { payoutDetails: "Max 500 characters" });
    req.ambassador.payoutDetails = payoutDetails;
    await req.ambassador.save();
    res.json({ payoutDetails });
  });

  router.get("/referrals", async (req, res) => {
    const rows = await Referral.find({ ambassador: req.ambassador._id })
      .populate("referredUser", "name email").populate("business", "name type")
      .sort({ createdAt: -1 }).limit(500).lean();
    res.json({
      referrals: rows.map((r) => ({
        _id: r._id,
        status: r.status,
        createdAt: r.createdAt,
        convertedAt: r.convertedAt,
        name: r.referredUser?.name || "",
        email: maskEmail(r.referredUser?.email),
        business: r.business ? { name: r.business.name, type: r.business.type } : null,
      })),
    });
  });

  router.get("/commissions", async (req, res) => {
    const commissions = await Commission.find({ ambassador: req.ambassador._id })
      .select("baseAmount currency amount status isFirstPayment createdAt approvedAt voidReason payout")
      .sort({ createdAt: -1 }).limit(500).lean();
    res.json({ commissions });
  });

  router.get("/payouts", async (req, res) => {
    const payouts = await Payout.find({ ambassador: req.ambassador._id })
      .select("amount currency method reference note paidAt commissions createdAt").sort({ paidAt: -1 }).lean();
    res.json({ payouts });
  });

  return router;
}
