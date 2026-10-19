// /api/sales — record and list sales. Prices and totals are computed on the
// server from the product catalogue; the client only sends product ids and quantities.
import express from "express";
import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import User from "../models/User.js";
import { Product } from "../models/Inventory.js";
import { protect, requireRole, loadBusiness, requireActiveSubscription } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { str, isObjectId, requireObjectId, paging } from "../utils/validate.js";

const PAYMENT_METHODS = ["cash", "transfer", "card", "other"];

async function rollback(business, deducted) {
  for (const d of deducted) {
    await Product.updateOne({ _id: d.product, business }, { $inc: { stockQuantity: d.quantity } });
  }
}

export default function salesRoutes(config) {
  const router = express.Router();
  router.use(protect(config), loadBusiness());

  router.get("/", async (req, res) => {
    const { page, limit, skip } = paging(req.query);
    const q = { business: req.business._id };
    if (req.user.role === "staff") q.$or = [{ recordedBy: req.user._id }, { staff: req.user._id }];
    else if (req.query.staff && isObjectId(String(req.query.staff))) q.staff = String(req.query.staff);
    if (req.query.status && ["completed", "voided"].includes(req.query.status)) q.status = req.query.status;
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && isNaN(from)) || (to && isNaN(to))) throw ApiError.badRequest("Invalid date range");
    if (from || to) q.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    const [sales, total] = await Promise.all([
      Sale.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("staff", "name").populate("recordedBy", "name").lean(),
      Sale.countDocuments(q),
    ]);
    res.json({ sales, total, page, limit });
  });

  router.post("/", requireRole("owner", "staff"), requireActiveSubscription(config), async (req, res) => {
    const b = req.business;
    const body = req.body || {};
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100)
      throw ApiError.badRequest("Validation failed", { items: "Add at least one item (max 100)" });

    // Merge duplicate lines and validate.
    const qty = new Map();
    for (const [i, it] of body.items.entries()) {
      if (!isObjectId(it?.product)) throw ApiError.badRequest("Validation failed", { [`items.${i}.product`]: "Invalid product" });
      if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 100000)
        throw ApiError.badRequest("Validation failed", { [`items.${i}.quantity`]: "Quantity must be a whole number of 1 or more" });
      qty.set(it.product, (qty.get(it.product) || 0) + it.quantity);
    }
    const paymentMethod = body.paymentMethod || "cash";
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw ApiError.badRequest("Validation failed", { paymentMethod: "Invalid payment method" });

    // Staff attribution according to the business setting.
    const mode = b.settings.staffSalesTracking;
    let staff = null;
    if (mode !== "off") {
      if (req.user.role === "staff") staff = req.user._id;
      else if (body.staff) {
        if (!isObjectId(body.staff)) throw ApiError.badRequest("Validation failed", { staff: "Invalid staff member" });
        const isOwnerSelf = String(body.staff) === String(req.user._id);
        const member = isOwnerSelf ? req.user : await User.findOne({ _id: body.staff, business: b._id, role: "staff", status: "active" });
        if (!member) throw ApiError.badRequest("Validation failed", { staff: "Staff member not found or inactive" });
        staff = member._id;
      } else if (mode === "required") {
        throw ApiError.badRequest("Validation failed", { staff: "Select the staff member who made this sale" });
      }
    }

    const ids = [...qty.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: ids }, business: b._id, active: true });
    if (products.length !== ids.length) throw ApiError.badRequest("One or more products were not found or are inactive");

    const items = [];
    const deducted = [];
    for (const p of products) {
      const quantity = qty.get(String(p._id));
      if (p.trackStock) {
        const ok = await Product.updateOne(
          { _id: p._id, business: b._id, stockQuantity: { $gte: quantity } },
          { $inc: { stockQuantity: -quantity } }
        );
        if (!ok.modifiedCount) {
          await rollback(b._id, deducted);
          const fresh = await Product.findById(p._id).select("stockQuantity");
          throw ApiError.conflict(`Not enough stock for "${p.name}" (available: ${fresh?.stockQuantity ?? 0})`);
        }
        deducted.push({ product: p._id, quantity });
      }
      items.push({ product: p._id, name: p.name, sku: p.sku, quantity, unitPrice: p.price, lineTotal: p.price * quantity, stockDeducted: p.trackStock });
    }

    try {
      const sale = await Sale.create({
        business: b._id, items, total: items.reduce((s, i) => s + i.lineTotal, 0), currency: b.currency,
        paymentMethod, staff, recordedBy: req.user._id, note: str(body.note).slice(0, 300),
      });
      res.status(201).json({ sale });
    } catch (e) {
      await rollback(b._id, deducted);
      throw e;
    }
  });

  router.post("/:id/void", requireRole("owner"), async (req, res) => {
    requireObjectId(req.params.id);
    const sale = await Sale.findOneAndUpdate(
      { _id: req.params.id, business: req.business._id, status: "completed" },
      { status: "voided", voidedAt: new Date(), voidedBy: req.user._id },
      { new: true }
    );
    if (!sale) throw ApiError.notFound("Sale not found or already voided");
    for (const it of sale.items)
      if (it.stockDeducted)
        await Product.updateOne({ _id: it.product, business: req.business._id }, { $inc: { stockQuantity: it.quantity } });
    res.json({ sale });
  });

  return router;
}
