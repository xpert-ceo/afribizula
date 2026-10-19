import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    name: { type: String, required: true }, // snapshot at time of sale
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // minor units, taken from the product server-side
    lineTotal: { type: Number, required: true, min: 0 },
    stockDeducted: { type: Boolean, default: false },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    business: { type: ObjectId, ref: "Business", required: true, index: true },
    items: { type: [saleItemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    paymentMethod: { type: String, enum: ["cash", "transfer", "card", "other"], default: "cash" },
    staff: { type: ObjectId, ref: "User", default: null }, // attribution (when staff-sales tracking is on)
    recordedBy: { type: ObjectId, ref: "User", required: true },
    note: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ["completed", "voided"], default: "completed" },
    voidedAt: { type: Date },
    voidedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
saleSchema.index({ business: 1, createdAt: -1 });

export default mongoose.models.Sale || mongoose.model("Sale", saleSchema);
