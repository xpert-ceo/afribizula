import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./helpers.js";

let s;
before(async () => { s = await startStack(); });
after(async () => { await s.stop(); });

async function catalog(token) {
  const d = await s.api("POST", "/api/inventory/departments", { token, body: { name: "Groceries" } });
  assert.equal(d.status, 201, JSON.stringify(d.body));
  const c = await s.api("POST", "/api/inventory/categories", { token, body: { name: "Beverages", department: d.body.department._id } });
  assert.equal(c.status, 201);
  const p = await s.api("POST", "/api/inventory/products", {
    token, body: { name: "Malt 33cl", sku: "MALT33", price: 50000, costPrice: 35000, stockQuantity: 10, category: c.body.category._id },
  });
  assert.equal(p.status, 201, JSON.stringify(p.body));
  return { dept: d.body.department, cat: c.body.category, product: p.body.product };
}

test("new owners must complete onboarding before using business APIs", async () => {
  const reg = await s.register({ name: "New Owner", email: "new@example.com" });
  const r = await s.api("GET", "/api/business/summary", { token: reg.token });
  assert.equal(r.status, 409);
  assert.equal(r.body.details.code, "ONBOARDING_REQUIRED");

  const bad = await s.api("POST", "/api/business/onboarding", { token: reg.token, body: { name: "X", type: "farm", country: "ZZ", currency: "ABC" } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details.type && bad.body.details.country && bad.body.details.currency && bad.body.details.name);

  const ok = await s.api("POST", "/api/business/onboarding", {
    token: reg.token, body: { name: "Mama Put Stores", type: "retail", country: "gh", currency: "ghs", staffSalesTracking: "optional" },
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.onboardingCompleted, true);
  assert.equal(ok.body.business.country, "GH");
  assert.equal(ok.body.business.currency, "GHS");
  assert.equal(ok.body.business.settings.staffSalesTracking, "optional");
  assert.equal(ok.body.business.subscription.status, "none");

  const sum = await s.api("GET", "/api/business/summary", { token: reg.token });
  assert.equal(sum.status, 200);
  assert.ok(sum.body.checklist.some((c) => c.key === "departments" && !c.done));
});

test("inventory hierarchy: departments → categories → products with integrity checks", async () => {
  const o = await s.owner("inv@example.com");
  const { dept, cat, product } = await catalog(o.token);
  assert.equal(String(product.department), String(dept._id), "department derived from category on the server");

  assert.equal((await s.api("POST", "/api/inventory/departments", { token: o.token, body: { name: "groceries" } })).status, 409, "case-insensitive unique name");
  assert.equal((await s.api("DELETE", `/api/inventory/departments/${dept._id}`, { token: o.token })).status, 409, "cannot delete dept with categories");
  assert.equal((await s.api("DELETE", `/api/inventory/categories/${cat._id}`, { token: o.token })).status, 409, "cannot delete category with products");
  assert.equal((await s.api("POST", "/api/inventory/products", { token: o.token, body: { name: "Bad", price: -1, category: cat._id } })).status, 400);
  assert.equal((await s.api("POST", "/api/inventory/products", { token: o.token, body: { name: "Dup", sku: "MALT33", price: 1, category: cat._id } })).status, 409);
  assert.equal((await s.api("PATCH", `/api/inventory/products/${product._id}`, { token: o.token, body: { stockQuantity: 999 } })).status, 400, "stock only via adjustment");

  const adj = await s.api("POST", `/api/inventory/products/${product._id}/stock`, { token: o.token, body: { adjustment: 5 } });
  assert.equal(adj.body.product.stockQuantity, 15);
  assert.equal((await s.api("POST", `/api/inventory/products/${product._id}/stock`, { token: o.token, body: { adjustment: -100 } })).status, 409);
  assert.equal((await s.api("GET", "/api/inventory/products/not-an-id/stock", { token: o.token })).status, 404);
  assert.equal((await s.api("POST", "/api/inventory/products/not-an-id/stock", { token: o.token, body: { adjustment: 1 } })).status, 400);
});

test("businesses cannot see or change each other's records", async () => {
  const a = await s.owner("a@example.com");
  const b = await s.owner("b@example.com");
  const { cat, product } = await catalog(a.token);

  const list = await s.api("GET", "/api/inventory/products", { token: b.token });
  assert.equal(list.body.products.length, 0);
  assert.equal((await s.api("PATCH", `/api/inventory/products/${product._id}`, { token: b.token, body: { price: 1 } })).status, 404);
  assert.equal((await s.api("POST", "/api/inventory/products", { token: b.token, body: { name: "Steal", price: 1, category: cat._id } })).status, 400);
  assert.equal((await s.api("POST", "/api/sales", { token: b.token, body: { items: [{ product: product._id, quantity: 1 }] } })).status, 400);
});

test("sales: server-side prices, stock deduction, rollback on insufficient stock, void restores stock", async () => {
  const o = await s.owner("sales@example.com");
  const { cat, product } = await catalog(o.token);
  const p2 = (await s.api("POST", "/api/inventory/products", { token: o.token, body: { name: "Water", price: 20000, stockQuantity: 1, category: cat._id } })).body.product;

  const sale = await s.api("POST", "/api/sales", {
    token: o.token,
    body: { items: [{ product: product._id, quantity: 2, unitPrice: 1 }, { product: product._id, quantity: 1 }], total: 3, paymentMethod: "transfer" },
  });
  assert.equal(sale.status, 201, JSON.stringify(sale.body));
  assert.equal(sale.body.sale.items.length, 1, "duplicate lines merged");
  assert.equal(sale.body.sale.items[0].quantity, 3);
  assert.equal(sale.body.sale.items[0].unitPrice, 50000, "client-supplied unitPrice ignored");
  assert.equal(sale.body.sale.total, 150000, "client-supplied total ignored");
  assert.equal(sale.body.sale.staff, null, "tracking off → no attribution");

  const fail = await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: product._id, quantity: 1 }, { product: p2._id, quantity: 5 }] } });
  assert.equal(fail.status, 409);
  const after = (await s.api("GET", "/api/inventory/products", { token: o.token })).body.products;
  assert.equal(after.find((p) => p._id === product._id).stockQuantity, 7, "first item rolled back (10 - 3)");

  const v = await s.api("POST", `/api/sales/${sale.body.sale._id}/void`, { token: o.token });
  assert.equal(v.status, 200);
  const restored = (await s.api("GET", "/api/inventory/products", { token: o.token })).body.products;
  assert.equal(restored.find((p) => p._id === product._id).stockQuantity, 10);
  assert.equal((await s.api("POST", `/api/sales/${sale.body.sale._id}/void`, { token: o.token })).status, 404, "cannot void twice");
  assert.equal((await s.api("POST", "/api/sales", { token: o.token, body: { items: [] } })).status, 400);
  assert.equal((await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: product._id, quantity: 1.5 }] } })).status, 400);
});

test("service businesses: items without stock tracking", async () => {
  const o = await s.owner("salon@example.com", { type: "service" });
  const d = (await s.api("POST", "/api/inventory/departments", { token: o.token, body: { name: "Hair" } })).body.department;
  const c = (await s.api("POST", "/api/inventory/categories", { token: o.token, body: { name: "Braids", department: d._id } })).body.category;
  const p = (await s.api("POST", "/api/inventory/products", { token: o.token, body: { name: "Knotless braids", price: 1500000, category: c._id } })).body.product;
  assert.equal(p.trackStock, false);
  const sale = await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: p._id, quantity: 3 }] } });
  assert.equal(sale.status, 201);
});

test("staff: owner creates staff; staff permissions and configurable staff-sales tracking", async () => {
  const o = await s.owner("boss@example.com", { staffSalesTracking: "required" });
  const { product } = await catalog(o.token);

  const created = await s.api("POST", "/api/staff", { token: o.token, body: { name: "Tunde", email: "tunde@example.com", password: "TempPass123" } });
  assert.equal(created.status, 201);
  assert.equal(created.body.staff.mustChangePassword, true);
  const login = await s.api("POST", "/api/auth/login", { body: { email: "tunde@example.com", password: "TempPass123" } });
  const staffToken = login.body.token;
  assert.equal(login.body.user.role, "staff");

  // Staff can read products, but not cost prices, and cannot write inventory, staff, billing or settings.
  const prods = await s.api("GET", "/api/inventory/products", { token: staffToken });
  assert.equal(prods.status, 200);
  assert.equal(prods.body.products[0].costPrice, undefined);
  assert.equal((await s.api("POST", "/api/inventory/departments", { token: staffToken, body: { name: "X" } })).status, 403);
  assert.equal((await s.api("GET", "/api/staff", { token: staffToken })).status, 403);
  assert.equal((await s.api("PATCH", "/api/business", { token: staffToken, body: { name: "Hacked" } })).status, 403);
  assert.equal((await s.api("POST", "/api/billing/checkout", { token: staffToken, body: { plan: "retail" } })).status, 403);

  // Required mode: owner must attribute; staff sales are auto-attributed to the staff member.
  assert.equal((await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: product._id, quantity: 1 }] } })).status, 400);
  const ownerSale = await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: product._id, quantity: 1 }], staff: created.body.staff._id } });
  assert.equal(ownerSale.status, 201);
  assert.equal(String(ownerSale.body.sale.staff), String(created.body.staff._id));
  const staffSale = await s.api("POST", "/api/sales", { token: staffToken, body: { items: [{ product: product._id, quantity: 1 }], staff: o.user._id } });
  assert.equal(String(staffSale.body.sale.staff), String(created.body.staff._id), "staff cannot attribute to someone else");
  assert.equal((await s.api("POST", `/api/sales/${staffSale.body.sale._id}/void`, { token: staffToken })).status, 403);

  // Staff only see their own sales.
  const mine = await s.api("GET", "/api/sales", { token: staffToken });
  assert.ok(mine.body.sales.every((x) => x.staff?._id === created.body.staff._id || x.recordedBy?._id === created.body.staff._id));

  const summary = await s.api("GET", "/api/business/summary", { token: o.token });
  assert.equal(summary.body.salesByStaff[0].count, 2);

  // Setting is configurable.
  const off = await s.api("PATCH", "/api/business", { token: o.token, body: { staffSalesTracking: "off" } });
  assert.equal(off.body.business.settings.staffSalesTracking, "off");
  assert.equal((await s.api("POST", "/api/sales", { token: o.token, body: { items: [{ product: product._id, quantity: 1 }] } })).status, 201);

  // Suspending staff blocks them.
  await s.api("PATCH", `/api/staff/${created.body.staff._id}`, { token: o.token, body: { status: "suspended" } });
  assert.equal((await s.api("GET", "/api/sales", { token: staffToken })).status, 403);
});

