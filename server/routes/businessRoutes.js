// /api/business — onboarding, business settings, dashboard summary
// /api/staff    — staff accounts (owner only)
import express from "express";
import mongoose from "mongoose";
import Business, { BUSINESS_TYPES, STAFF_SALES_MODES } from "../models/Business.js";
import User from "../models/User.js";
import { Department, Category, Product } from "../models/Inventory.js";
import Sale from "../models/Sale.js";
import { Referral } from "../models/Ambassador.js";
import { audit } from "../models/System.js";
import { protect, requireRole, loadBusiness } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { collect, str, isEmail, normEmail, passwordProblem, requireObjectId } from "../utils/validate.js";
import { hashPassword } from "../controllers/authController.js";
import { sessionPayload } from "../services/session.js";

const CURRENCIES = new Set(Intl.supportedValuesOf("currency"));
const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
// ISO 3166-1 alpha-2 country codes known to the runtime, excluding non-country/reserved codes.
const NON_COUNTRIES = new Set(["ZZ", "EU", "EZ", "UN", "QO", "XA", "XB"]);
const validCountry = (c) => /^[A-Z]{2}$/.test(c) && !NON_COUNTRIES.has(c) && Boolean(regionNames.of(c));

function validateProfile(body, v, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = str(body.name);
    if (name.length < 2 || name.length > 120) v.add("name", "Business name must be 2–120 characters");
    out.name = name;
  }
  if (!partial || body.type !== undefined) {
    if (!BUSINESS_TYPES.includes(body.type)) v.add("type", "Choose retail or service");
    out.type = body.type;
  }
  if (!partial || body.country !== undefined) {
    const country = str(body.country).toUpperCase();
    if (!validCountry(country)) v.add("country", "Choose a valid country");
    out.country = country;
  }
  if (!partial || body.currency !== undefined) {
    const currency = str(body.currency).toUpperCase();
    if (!CURRENCIES.has(currency)) v.add("currency", "Choose a valid currency");
    out.currency = currency;
  }
  if (body.staffSalesTracking !== undefined) {
    if (!STAFF_SALES_MODES.includes(body.staffSalesTracking))
      v.add("staffSalesTracking", "Choose off, optional or required");
    out.staffSalesTracking = body.staffSalesTracking;
  }
  if (body.lowStockThreshold !== undefined) {
    if (!Number.isInteger(body.lowStockThreshold) || body.lowStockThreshold < 0 || body.lowStockThreshold > 100000)
      v.add("lowStockThreshold", "Must be a whole number of 0 or more");
    out.lowStockThreshold = body.lowStockThreshold;
  }
  return out;
}

export function businessRoutes(config) {
  const router = express.Router();
  router.use(protect(config));

  // Create (or redo) the business profile and finish onboarding. Owners only.
  router.post("/onboarding", requireRole("owner"), async (req, res) => {
    const v = collect();
    const data = validateProfile(req.body || {}, v);
    v.throwIfAny();

    let business = req.user.business ? await Business.findById(req.user.business) : null;
    if (!business) business = new Business({ owner: req.user._id });
    business.set({ name: data.name, type: data.type, country: data.country, currency: data.currency });
    if (data.staffSalesTracking) business.settings.staffSalesTracking = data.staffSalesTracking;
    await business.save();

    req.user.business = business._id;
    req.user.onboardingCompleted = true;
    await req.user.save();
    await Referral.updateOne({ referredUser: req.user._id, business: null }, { business: business._id });

    res.status(201).json(await sessionPayload(req.user));
  });

  router.get("/", loadBusiness(), async (req, res) => {
    res.json({ business: (await sessionPayload(req.user)).business });
  });

  router.patch("/", requireRole("owner"), loadBusiness(), async (req, res) => {
    const v = collect();
    const data = validateProfile(req.body || {}, v, { partial: true });
    v.throwIfAny();
    const b = req.business;
    for (const k of ["name", "type", "country", "currency"]) if (data[k] !== undefined) b[k] = data[k];
    if (data.staffSalesTracking !== undefined) b.settings.staffSalesTracking = data.staffSalesTracking;
    if (data.lowStockThreshold !== undefined) b.settings.lowStockThreshold = data.lowStockThreshold;
    await b.save();
    res.json({ business: (await sessionPayload(req.user)).business });
  });

  router.get("/summary", loadBusiness(), async (req, res) => {
    const b = req.business;
    const isOwner = req.user.role === "owner";
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 864e5);

    const saleScope = { business: b._id, status: "completed" };
    if (!isOwner) saleScope.$or = [{ recordedBy: req.user._id }, { staff: req.user._id }];

    const totals = async (from) => {
      const [r] = await Sale.aggregate([
        { $match: { ...saleScope, createdAt: { $gte: from } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
      ]);
      return { count: r?.count || 0, total: r?.total || 0 };
    };

    const [departments, categories, products, staffCount, today, last7, lowStock] = await Promise.all([
      Department.countDocuments({ business: b._id }),
      Category.countDocuments({ business: b._id }),
      Product.countDocuments({ business: b._id, active: true }),
      User.countDocuments({ business: b._id, role: "staff" }),
      totals(startOfDay),
      totals(weekAgo),
      Product.find({ business: b._id, active: true, trackStock: true, stockQuantity: { $lte: b.settings.lowStockThreshold } })
        .select("name sku stockQuantity").sort({ stockQuantity: 1 }).limit(10),
    ]);

    let salesByStaff = [];
    if (isOwner && b.settings.staffSalesTracking !== "off") {
      salesByStaff = await Sale.aggregate([
        { $match: { business: b._id, status: "completed", createdAt: { $gte: weekAgo }, staff: { $ne: null } } },
        { $group: { _id: "$staff", count: { $sum: 1 }, total: { $sum: "$total" } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
        { $project: { count: 1, total: 1, name: { $arrayElemAt: ["$u.name", 0] } } },
        { $sort: { total: -1 } },
      ]);
    }

    const subscription = b.subscriptionView();
    const anySale = await Sale.exists({ business: b._id });
    const checklist = isOwner
      ? [
          { key: "profile", label: "Set up your business profile", done: true, to: "/app/settings" },
          { key: "departments", label: "Create a department", done: departments > 0, to: "/app/inventory" },
          { key: "categories", label: "Create a category inside a department", done: categories > 0, to: "/app/inventory" },
          { key: "products", label: b.type === "service" ? "Add your first service" : "Add your first product", done: products > 0, to: "/app/inventory" },
          { key: "sale", label: "Record your first sale", done: Boolean(anySale), to: "/app/sales" },
          ...(b.settings.staffSalesTracking !== "off"
            ? [{ key: "staff", label: "Add a staff member", done: staffCount > 0, to: "/app/staff" }]
            : []),
          { key: "subscription", label: "Choose a subscription plan", done: subscription.status === "active", to: "/app/billing" },
        ]
      : [];

    res.json({
      counts: { departments, categories, products, staff: staffCount },
      sales: { today, last7Days: last7 },
      lowStock,
      salesByStaff,
      subscription,
      checklist,
      currency: b.currency,
    });
  });

  return router;
}

export function staffRoutes(config) {
  const router = express.Router();
  router.use(protect(config), requireRole("owner"), loadBusiness());

  router.get("/", async (req, res) => {
    const staff = await User.find({ business: req.business._id, role: "staff" })
      .select("name email status mustChangePassword lastLoginAt createdAt").sort({ createdAt: -1 });
    res.json({ staff });
  });

  router.post("/", async (req, res) => {
    const v = collect();
    const name = str(req.body?.name);
    const email = normEmail(req.body?.email);
    const password = req.body?.password;
    if (name.length < 2) v.add("name", "Enter the staff member's name");
    if (!isEmail(email)) v.add("email", "Enter a valid email address");
    const pwErr = passwordProblem(password);
    if (pwErr) v.add("password", pwErr);
    v.throwIfAny();
    if (await User.exists({ email })) throw ApiError.conflict("An account with this email already exists");

    const user = await User.create({
      name, email, password: await hashPassword(password),
      role: "staff", business: req.business._id, onboardingCompleted: true, mustChangePassword: true,
    });
    await audit(req.user, "staff.create", "User", user._id, { business: req.business._id });
    res.status(201).json({ staff: user.toSafeJSON() });
  });

  router.patch("/:id", async (req, res) => {
    requireObjectId(req.params.id);
    const status = req.body?.status;
    if (!["active", "suspended"].includes(status)) throw ApiError.badRequest("status must be active or suspended");
    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), business: req.business._id, role: "staff" });
    if (!user) throw ApiError.notFound("Staff member not found");
    user.status = status;
    await user.save();
    await audit(req.user, `staff.${status}`, "User", user._id);
    res.json({ staff: user.toSafeJSON() });
  });

  return router;
}
