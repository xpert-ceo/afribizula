import mongoose from "mongoose";

export const BUSINESS_TYPES = ["retail", "service"];
export const STAFF_SALES_MODES = ["off", "optional", "required"];

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    type: { type: String, enum: BUSINESS_TYPES, required: true },
    country: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 }, // ISO 3166-1 alpha-2
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 }, // ISO 4217
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    settings: {
      // off: sales are not attributed to staff
      // optional: a staff member may be attached to a sale
      // required: every sale must be attributed to a staff member
      staffSalesTracking: { type: String, enum: STAFF_SALES_MODES, default: "off" },
      lowStockThreshold: { type: Number, default: 5, min: 0 },
    },
    subscription: {
      plan: { type: String, default: null },
      status: { type: String, enum: ["none", "active"], default: "none" },
      currentPeriodEnd: { type: Date, default: null },
      lastPaymentAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

/** Subscription state as seen by users: derives "expired" from the period end. */
businessSchema.methods.subscriptionView = function subscriptionView(now = new Date()) {
  const s = this.subscription || {};
  let status = s.status || "none";
  if (status === "active" && (!s.currentPeriodEnd || s.currentPeriodEnd <= now)) status = "expired";
  return { plan: s.plan || null, status, currentPeriodEnd: s.currentPeriodEnd || null, lastPaymentAt: s.lastPaymentAt || null };
};

export default mongoose.models.Business || mongoose.model("Business", businessSchema);
