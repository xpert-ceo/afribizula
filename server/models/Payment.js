import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const paymentSchema = new mongoose.Schema(
  {
    business: { type: ObjectId, ref: "Business", required: true, index: true },
    user: { type: ObjectId, ref: "User", required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true }, // minor units expected for the plan
    currency: { type: String, required: true },
    provider: { type: String, default: "paystack" },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ["initialized", "success", "failed"], default: "initialized" },
    paidAt: { type: Date },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    failureReason: { type: String },
    processedVia: { type: String, enum: ["verify", "webhook", null], default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
