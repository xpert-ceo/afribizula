import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// An ambassador is a User with role "ambassador" plus this profile.
const ambassadorSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // pending: applied, referral code not yet usable; active: code accepted; suspended: code rejected
    status: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
    approvedAt: { type: Date },
    approvedBy: { type: ObjectId, ref: "User" },
    payoutDetails: { type: String, trim: true, maxlength: 500 }, // free text supplied by ambassador (e.g. bank name/account)
  },
  { timestamps: true }
);

// One referred account can only ever be attributed once (unique referredUser).
const referralSchema = new mongoose.Schema(
  {
    ambassador: { type: ObjectId, ref: "Ambassador", required: true, index: true },
    code: { type: String, required: true },
    referredUser: { type: ObjectId, ref: "User", required: true, unique: true },
    business: { type: ObjectId, ref: "Business", default: null },
    status: { type: String, enum: ["signed_up", "converted"], default: "signed_up" },
    convertedAt: { type: Date },
  },
  { timestamps: true }
);

// One commission per payment at most (unique payment) — protects against the
// verify endpoint and the webhook both processing the same payment.
const commissionSchema = new mongoose.Schema(
  {
    ambassador: { type: ObjectId, ref: "Ambassador", required: true, index: true },
    referral: { type: ObjectId, ref: "Referral", required: true },
    payment: { type: ObjectId, ref: "Payment", required: true, unique: true },
    isFirstPayment: { type: Boolean, default: false },
    baseAmount: { type: Number, required: true }, // payment amount, minor units
    currency: { type: String, required: true },
    policySnapshot: { type: Object, default: null },
    amount: { type: Number, default: null }, // minor units; null while awaiting a policy
    status: {
      type: String,
      enum: ["awaiting_policy", "pending", "approved", "paid", "void"],
      default: "awaiting_policy",
      index: true,
    },
    approvedAt: { type: Date },
    approvedBy: { type: ObjectId, ref: "User" },
    voidReason: { type: String },
    payout: { type: ObjectId, ref: "Payout", default: null },
  },
  { timestamps: true }
);

const payoutSchema = new mongoose.Schema(
  {
    ambassador: { type: ObjectId, ref: "Ambassador", required: true, index: true },
    commissions: [{ type: ObjectId, ref: "Commission" }],
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    method: { type: String, trim: true, maxlength: 80 },
    reference: { type: String, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 500 },
    recordedBy: { type: ObjectId, ref: "User", required: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Ambassador = mongoose.models.Ambassador || mongoose.model("Ambassador", ambassadorSchema);
export const Referral = mongoose.models.Referral || mongoose.model("Referral", referralSchema);
export const Commission = mongoose.models.Commission || mongoose.model("Commission", commissionSchema);
export const Payout = mongoose.models.Payout || mongoose.model("Payout", payoutSchema);
