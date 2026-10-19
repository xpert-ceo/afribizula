// /api/inventory — Departments → Categories → Products, scoped to the caller's business.
// Owners can write; staff can read (without cost prices).
import express from "express";
import { Department, Category, Product } from "../models/Inventory.js";
import Sale from "../models/Sale.js";
import { protect, requireRole, loadBusiness, requireActiveSubscription } from "../middleware/authMiddleware.js";
import ApiError from "../utils/ApiError.js";
import { collect, str, isMoney, isNonNegInt, requireObjectId, escapeRegex, isObjectId } from "../utils/validate.js";

const nameOf = (body, v, field = "name", max = 80) => {
  const n = str(body?.[field]);
  if (n.length < 1 || n.length > max) v.add(field, `Name is required (max ${max} characters)`);
  return n;
};

export default function inventoryRoutes(config) {
  const router = express.Router();
  router.use(protect(config), loadBusiness());
  const ownerWrite = [requireRole("owner"), requireActiveSubscription(config)];
  const scope = (req, extra = {}) => ({ business: req.business._id, ...extra });

  // ---------- Departments ----------
  router.get("/departments", async (req, res) => {
    const departments = await Department.find(scope(req)).sort({ name: 1 }).lean();
    const counts = await Category.aggregate([
      { $match: scope(req) },
      { $group: { _id: "$department", n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ departments: departments.map((d) => ({ ...d, categoryCount: byId[String(d._id)] || 0 })) });
  });

  router.post("/departments", ...ownerWrite, async (req, res) => {
    const v = collect();
    const name = nameOf(req.body, v);
    v.throwIfAny();
    const department = await Department.create({ ...scope(req), name, description: str(req.body?.description) });
    res.status(201).json({ department });
  });

  router.patch("/departments/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    const v = collect();
    const name = nameOf(req.body, v);
    v.throwIfAny();
    const department = await Department.findOneAndUpdate(scope(req, { _id: req.params.id }), { name }, { new: true, runValidators: true });
    if (!department) throw ApiError.notFound("Department not found");
    res.json({ department });
  });

  router.delete("/departments/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    if (await Category.exists(scope(req, { department: req.params.id })))
      throw ApiError.conflict("Remove or move this department's categories first");
    const r = await Department.deleteOne(scope(req, { _id: req.params.id }));
    if (!r.deletedCount) throw ApiError.notFound("Department not found");
    res.json({ deleted: true });
  });

  // ---------- Categories ----------
  router.get("/categories", async (req, res) => {
    const q = scope(req);
    if (req.query.department) q.department = requireObjectId(String(req.query.department), "department");
    const categories = await Category.find(q).populate("department", "name").sort({ name: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { business: req.business._id, active: true } },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({ categories: categories.map((c) => ({ ...c, productCount: byId[String(c._id)] || 0 })) });
  });

  router.post("/categories", ...ownerWrite, async (req, res) => {
    const v = collect();
    const name = nameOf(req.body, v);
    if (!isObjectId(req.body?.department)) v.add("department", "Choose a department");
    v.throwIfAny();
    const dept = await Department.findOne(scope(req, { _id: req.body.department }));
    if (!dept) throw ApiError.badRequest("Validation failed", { department: "Department not found" });
    const category = await Category.create({ ...scope(req), department: dept._id, name });
    res.status(201).json({ category });
  });

  router.patch("/categories/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    const v = collect();
    const name = nameOf(req.body, v);
    v.throwIfAny();
    const category = await Category.findOneAndUpdate(scope(req, { _id: req.params.id }), { name }, { new: true, runValidators: true });
    if (!category) throw ApiError.notFound("Category not found");
    res.json({ category });
  });

  router.delete("/categories/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    if (await Product.exists(scope(req, { category: req.params.id })))
      throw ApiError.conflict("This category has products. Move or deactivate them first.");
    const r = await Category.deleteOne(scope(req, { _id: req.params.id }));
    if (!r.deletedCount) throw ApiError.notFound("Category not found");
    res.json({ deleted: true });
  });

  // ---------- Products ----------
  router.get("/products", async (req, res) => {
    const q = scope(req);
    if (req.query.category) q.category = requireObjectId(String(req.query.category), "category");
    if (req.query.department) q.department = requireObjectId(String(req.query.department), "department");
    if (req.query.active !== "all") q.active = req.query.active === "false" ? false : true;
    const search = str(req.query.search);
    if (search) q.$or = [{ name: new RegExp(escapeRegex(search), "i") }, { sku: new RegExp(escapeRegex(search), "i") }];

    let query = Product.find(q).populate("category", "name").populate("department", "name").sort({ name: 1 }).limit(500);
    if (req.user.role !== "owner") query = query.select("-costPrice");
    res.json({ products: await query.lean() });
  });

  function validateProduct(body, v, partial) {
    const out = {};
    if (!partial || body.name !== undefined) out.name = nameOf(body, v, "name", 120);
    if (body.sku !== undefined) {
      const sku = str(body.sku);
      if (sku.length > 64) v.add("sku", "SKU is too long");
      out.sku = sku || undefined;
    }
    if (!partial || body.price !== undefined) {
      if (!isMoney(body.price)) v.add("price", "Enter a price of 0 or more");
      out.price = body.price;
    }
    if (body.costPrice !== undefined && body.costPrice !== null) {
      if (!isMoney(body.costPrice)) v.add("costPrice", "Cost price must be 0 or more");
      out.costPrice = body.costPrice;
    } else if (body.costPrice === null) out.costPrice = null;
    if (body.trackStock !== undefined) {
      if (typeof body.trackStock !== "boolean") v.add("trackStock", "Must be true or false");
      out.trackStock = body.trackStock;
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") v.add("active", "Must be true or false");
      out.active = body.active;
    }
    return out;
  }

  router.post("/products", ...ownerWrite, async (req, res) => {
    const v = collect();
    const data = validateProduct(req.body || {}, v, false);
    if (!isObjectId(req.body?.category)) v.add("category", "Choose a category");
    const stock = req.body?.stockQuantity ?? 0;
    if (!isNonNegInt(stock)) v.add("stockQuantity", "Opening stock must be a whole number of 0 or more");
    v.throwIfAny();
    const cat = await Category.findOne(scope(req, { _id: req.body.category }));
    if (!cat) throw ApiError.badRequest("Validation failed", { category: "Category not found" });
    const product = await Product.create({
      ...scope(req), ...data, category: cat._id, department: cat.department,
      trackStock: data.trackStock ?? req.business.type !== "service",
      stockQuantity: (data.trackStock ?? req.business.type !== "service") ? stock : 0,
    });
    res.status(201).json({ product });
  });

  router.patch("/products/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    if (req.body?.stockQuantity !== undefined)
      throw ApiError.badRequest("Use the stock adjustment endpoint to change stock");
    const v = collect();
    const data = validateProduct(req.body || {}, v, true);
    if (req.body?.category !== undefined && !isObjectId(req.body.category)) v.add("category", "Choose a category");
    v.throwIfAny();
    const product = await Product.findOne(scope(req, { _id: req.params.id }));
    if (!product) throw ApiError.notFound("Product not found");
    if (req.body?.category) {
      const cat = await Category.findOne(scope(req, { _id: req.body.category }));
      if (!cat) throw ApiError.badRequest("Validation failed", { category: "Category not found" });
      product.category = cat._id;
      product.department = cat.department;
    }
    product.set(data);
    await product.save();
    res.json({ product });
  });

  // Stock adjustments: positive to receive stock, negative to write off. Never below zero.
  router.post("/products/:id/stock", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    const adj = req.body?.adjustment;
    if (!Number.isInteger(adj) || adj === 0 || Math.abs(adj) > 1e6)
      throw ApiError.badRequest("Validation failed", { adjustment: "Enter a non-zero whole number" });
    const filter = scope(req, { _id: req.params.id, trackStock: true });
    if (adj < 0) filter.stockQuantity = { $gte: -adj };
    const product = await Product.findOneAndUpdate(filter, { $inc: { stockQuantity: adj } }, { new: true });
    if (!product) {
      const exists = await Product.findOne(scope(req, { _id: req.params.id }));
      if (!exists) throw ApiError.notFound("Product not found");
      if (!exists.trackStock) throw ApiError.badRequest("Stock is not tracked for this item");
      throw ApiError.conflict(`Cannot remove more than the ${exists.stockQuantity} in stock`);
    }
    res.json({ product });
  });

  // Products are never hard-deleted once sold (sales keep a reference); deactivate instead.
  router.delete("/products/:id", ...ownerWrite, async (req, res) => {
    requireObjectId(req.params.id);
    const product = await Product.findOne(scope(req, { _id: req.params.id }));
    if (!product) throw ApiError.notFound("Product not found");
    if (await Sale.exists({ business: req.business._id, "items.product": product._id })) {
      product.active = false;
      await product.save();
      return res.json({ deleted: false, deactivated: true });
    }
    await product.deleteOne();
    res.json({ deleted: true });
  });

  return router;
}
