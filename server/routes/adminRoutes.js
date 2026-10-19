// /api/admin — main-admin interface. Every route requires role "admin",
// enforced here on the server (the frontend hiding links is not a control).
import express from "express";
import mongoose from "mongoose";
import User, { SAFE_USER_FIELDS } from "../models/User.js";
import Business from "../models/Business.js";
import Payment from "../models/Payment.js";
import Sale from "../models/Sale.js";
import { Ambassador, Referral, Commission, Payout } from "../models/Ambassador.js";
import { Setting, AuditLog, audit } from "../models/System.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { str, paging, escapeRegex, requireObjectId, isObjectId } from "../utils/validate.js";
import { POLICY_KEY, getPolicy, policyProblem, applyPolicyToAwaiting } from "../services/commissions.js";
import { issueResetLink } from "../controllers/authController.js";
import { commissionTotals } from "./ambassadorRoutes.js";

const oid = (s) => new mongoose.Types.ObjectId(s);

export default function adminRoutes(config) {
  const router = express.Router();
  router.use(protect(config), requireRole("admin"));

  // ---------- Overview ----------
  router.get("/stats", async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 864e5);
    const now = new Date();
    const [users, byRole, newUsers, businesses, activeSubs, ambassadors, pendingAmbassadors, referrals, converted, revenue, commissions, sales] =
      await Promise.all([
        User.countDocuments(),
        User.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        Business.countDocuments(),
        Business.countDocuments({ "subscription.status": "active", "subscription.currentPeriodEnd": { $gt: now } }),
        Ambassador.countDocuments(),
        Ambassador.countDocuments({ status: "pending" }),
        Referral.countDocuments(),
        Referral.countDocuments({ status: "converted" }),
        Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: "$currency", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
        commissionTotals({}),
        Sale.countDocuments({ status: "completed" }),
      ]);
    res.json({
      users, usersByRole: Object.fromEntries(byRole.map((r) => [r._id, r.n])), newUsersLast7Days: newUsers,
      businesses, activeSubscriptions: activeSubs, ambassadors, pendingAmbassadors, referrals, convertedReferrals: converted,
      subscriptionRevenue: revenue.map((r) => ({ currency: r._id, amount: r.amount, count: r.count })),
      commissions, salesRecorded: sales, commissionPolicy: await getPolicy(),
    });
  });

  // ---------- Users ----------
  router.get("/users", async (req, res) => {
    const { page, limit, skip } = paging(req.query);
    const q = {};
    if (req.query.role) q.role = String(req.query.role);
    if (req.query.status) q.status = String(req.query.status);
    const search = str(req.query.search);
    if (search) q.$or = [{ email: new RegExp(escapeRegex(search), "i") }, { name: new RegExp(escapeRegex(search), "i") }];
    const [users, total] = await Promise.all([
      User.find(q).select(SAFE_USER_FIELDS).populate("business", "name type").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(q),
    ]);
    res.json({ users, total, page, limit });
  });

  router.patch("/users/:id/status", async (req, res) => {
    requireObjectId(req.params.id);
    const status = req.body?.status;
    if (!["active", "suspended"].includes(status)) throw ApiError.badRequest("status must be active or suspended");
    if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest("You cannot change your own status");
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound("User not found");
    if (user.role === "admin") throw ApiError.forbidden("Admin accounts can only be changed from the server CLI");
    user.status = status;
    await user.save();
    await audit(req.user, `user.${status}`, "User", user._id, { reason: str(req.body?.reason) });
    res.json({ user: user.toSafeJSON() });
  });

  // Manual password recovery: generates a one-time link the admin delivers to the user.
  router.post("/users/:id/password-reset-link", async (req, res) => {
    requireObjectId(req.params.id);
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound("User not found");
    if (user.role === "admin") throw ApiError.forbidden("Reset admin passwords from the server CLI");
    const link = await issueResetLink(user, config);
    await audit(req.user, "user.password_reset_link", "User", user._id);
    res.json({ link, expiresInMinutes: 60 });
  });

  // ---------- Businesses ----------
  router.get("/businesses", async (req, res) => {
    const { page, limit, skip } = paging(req.query);
    const q = {};
    const search = str(req.query.search);
    if (search) q.name = new RegExp(escapeRegex(search), "i");
    const [rows, total] = await Promise.all([
      Business.find(q).populate("owner", "name email status").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Business.countDocuments(q),
    ]);
    res.json({
      businesses: rows.map((b) => ({
        _id: b._id, name: b.name, type: b.type, country: b.country, currency: b.currency, status: b.status,
        owner: b.owner, settings: b.settings, subscription: b.subscriptionView(), createdAt: b.createdAt,
      })),
      total, page, limit,
    });
  });

  router.patch("/businesses/:id/status", async (req, res) => {
    requireObjectId(req.params.id);
    const status = req.body?.status;
    if (!["active", "suspended"].includes(status)) throw ApiError.badRequest("status must be active or suspended");
    const b = await Business.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!b) throw ApiError.notFound("Business not found");
    await audit(req.user, `business.${status}`, "Business", b._id, { reason: str(req.body?.reason) });
    res.json({ business: { _id: b._id, status: b.status } });
  });

  router.get("/payments", async (req, res) => {
    const { page, limit, skip } = paging(req.query);
    const q = {};
    if (req.query.status) q.status = String(req.query.status);
    const [payments, total] = await Promise.all([
      Payment.find(q).populate("business", "name").populate("user", "email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(q),
    ]);
    res.json({ payments, total, page, limit });
  });

  // ---------- Ambassadors ----------
  router.get("/ambassadors", async (req, res) => {
    const q = {};
    if (req.query.status) q.status = String(req.query.status);
    const ambassadors = await Ambassador.find(q).populate("user", "name email status").sort({ createdAt: -1 }).lean();
    const ids = ambassadors.map((a) => a._id);
    const [refCounts, commRows] = await Promise.all([
      Referral.aggregate([{ $match: { ambassador: { $in: ids } } }, { $group: { _id: { a: "$ambassador", s: "$status" }, n: { $sum: 1 } } }]),
      Commission.aggregate([{ $match: { ambassador: { $in: ids } } }, { $group: { _id: { a: "$ambassador", s: "$status" }, amount: { $sum: { $ifNull: ["$amount", 0] } }, n: { $sum: 1 } } }]),
    ]);
    res.json({
      ambassadors: ambassadors.map((a) => {
        const k = String(a._id);
        const refs = refCounts.filter((r) => String(r._id.a) === k);
        const comm = commRows.filter((r) => String(r._id.a) === k);
        return {
          ...a,
          referrals: refs.reduce((s, r) => s + r.n, 0),
          converted: refs.find((r) => r._id.s === "converted")?.n || 0,
          commissions: Object.fromEntries(comm.map((c) => [c._id.s, { amount: c.amount, count: c.n }])),
        };
      }),
    });
  });

  router.patch("/ambassadors/:id", async (req, res) => {
    requireObjectId(req.params.id);
    const status = req.body?.status;
    if (!["active", "suspended", "pending"].includes(status)) throw ApiError.badRequest("status must be active, suspended or pending");
    const a = await Ambassador.findById(req.params.id);
    if (!a) throw ApiError.notFound("Ambassador not found");
    a.status = status;
    if (status === "active" && !a.approvedAt) { a.approvedAt = new Date(); a.approvedBy = req.user._id; }
    await a.save();
    await audit(req.user, `ambassador.${status}`, "Ambassador", a._id, { reason: str(req.body?.reason) });
    res.json({ ambassador: a });
  });

  router.get("/referrals", async (req, res) => {
    const q = {};
    if (req.query.ambassador && isObjectId(String(req.query.ambassador))) q.ambassador = String(req.query.ambassador);
    const referrals = await Referral.find(q)
      .populate({ path: "ambassador", select: "code user", populate: { path: "user", select: "name email" } })
      .populate("referredUser", "name email").populate("business", "name").sort({ createdAt: -1 }).limit(500).lean();
    res.json({ referrals });
  });

  // ---------- Commissions ----------
  router.get("/commissions", async (req, res) => {
    const q = {};
    if (req.query.status) q.status = String(req.query.status);
    if (req.query.ambassador && isObjectId(String(req.query.ambassador))) q.ambassador = String(req.query.ambassador);
    const commissions = await Commission.find(q)
      .populate({ path: "ambassador", select: "code user", populate: { path: "user", select: "name email" } })
      .populate({ path: "referral", select: "business referredUser", populate: [{ path: "business", select: "name" }, { path: "referredUser", select: "email" }] })
      .populate("payment", "reference plan paidAt").sort({ createdAt: -1 }).limit(500).lean();
    res.json({ commissions });
  });

  router.patch("/commissions/:id", async (req, res) => {
    requireObjectId(req.params.id);
    const action = req.body?.action;
    const c = await Commission.findById(req.params.id);
    if (!c) throw ApiError.notFound("Commission not found");
    if (action === "approve") {
      if (c.status !== "pending") throw ApiError.conflict(`Only pending commissions can be approved (current: ${c.status})`);
      c.status = "approved"; c.approvedAt = new Date(); c.approvedBy = req.user._id;
    } else if (action === "void") {
      if (["paid", "void"].includes(c.status)) throw ApiError.conflict(`A ${c.status} commission cannot be voided`);
      const reason = str(req.body?.reason);
      if (!reason) throw ApiError.badRequest("Validation failed", { reason: "Give a reason for voiding" });
      c.status = "void"; c.voidReason = reason;
    } else throw ApiError.badRequest("action must be approve or void");
    await c.save();
    await audit(req.user, `commission.${action}`, "Commission", c._id, { reason: c.voidReason });
    res.json({ commission: c });
  });

  // ---------- Payouts (recorded after the admin has paid the ambassador outside Bizula) ----------
  router.get("/payouts", async (_req, res) => {
    const payouts = await Payout.find()
      .populate({ path: "ambassador", select: "code user", populate: { path: "user", select: "name email" } })
      .populate("recordedBy", "name email").sort({ paidAt: -1 }).limit(500).lean();
    res.json({ payouts });
  });

  router.post("/payouts", async (req, res) => {
    const { ambassadorId, commissionIds } = req.body || {};
    requireObjectId(ambassadorId, "ambassadorId");
    if (!Array.isArray(commissionIds) || !commissionIds.length || !commissionIds.every(isObjectId))
      throw ApiError.badRequest("Validation failed", { commissionIds: "Select at least one approved commission" });
    const ids = [...new Set(commissionIds)].map(oid);
    const comms = await Commission.find({ _id: { $in: ids } });
    if (comms.length !== ids.length) throw ApiError.badRequest("One or more commissions were not found");
    if (comms.some((c) => String(c.ambassador) !== String(ambassadorId)))
      throw ApiError.badRequest("All commissions must belong to the selected ambassador");
    if (comms.some((c) => c.status !== "approved")) throw ApiError.conflict("Only approved, unpaid commissions can be paid out");
    const currencies = new Set(comms.map((c) => c.currency));
    if (currencies.size !== 1) throw ApiError.badRequest("A payout can only include commissions in one currency");

    const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    if (isNaN(paidAt)) throw ApiError.badRequest("Validation failed", { paidAt: "Invalid date" });

    const payout = await Payout.create({
      ambassador: ambassadorId, commissions: ids, amount: comms.reduce((s, c) => s + c.amount, 0),
      currency: [...currencies][0], method: str(req.body.method), reference: str(req.body.reference),
      note: str(req.body.note), recordedBy: req.user._id, paidAt,
    });
    // Conditional update so a commission can never be included in two payouts.
    const r = await Commission.updateMany({ _id: { $in: ids }, status: "approved" }, { status: "paid", payout: payout._id });
    if (r.modifiedCount !== ids.length) {
      await Commission.updateMany({ payout: payout._id }, { status: "approved", payout: null });
      await payout.deleteOne();
      throw ApiError.conflict("Some commissions changed while recording the payout. Please retry.");
    }
    await audit(req.user, "payout.record", "Payout", payout._id, { amount: payout.amount, currency: payout.currency });
    res.status(201).json({ payout });
  });

  // ---------- Commission policy (owner decision; nothing is hard-coded) ----------
  router.get("/settings/commission-policy", async (_req, res) => {
    res.json({ policy: await getPolicy() });
  });

  router.put("/settings/commission-policy", async (req, res) => {
    const policy = { type: req.body?.type, value: req.body?.value, basis: req.body?.basis };
    const problem = policyProblem(policy);
    if (problem) throw ApiError.badRequest(problem);
    await Setting.findOneAndUpdate({ key: POLICY_KEY }, { value: policy, updatedBy: req.user._id }, { upsert: true });
    const applied = await applyPolicyToAwaiting(policy);
    await audit(req.user, "settings.commission_policy", "Setting", null, { policy, applied });
    res.json({ policy, applied });
  });

  router.get("/audit-log", async (req, res) => {
    const { page, limit, skip } = paging(req.query, { defLimit: 50 });
    const [entries, total] = await Promise.all([
      AuditLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);
    res.json({ entries, total, page, limit });
  });

  return router;
}
