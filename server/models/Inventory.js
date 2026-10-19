import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

// Departments → Categories → Products. Every record carries `business` so that
// every query can be scoped to the caller's business.

const departmentSchema = new mongoose.Schema(
  {
    business: { type: ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);
departmentSchema.index({ business: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const categorySchema = new mongoose.Schema(
  {
    business: { type: ObjectId, ref: "Business", required: true, index: true },
    department: { type: ObjectId, ref: "Department", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);
categorySchema.index({ department: 1, name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const productSchema = new mongoose.Schema(
  {
    business: { type: ObjectId, ref: "Business", required: true, index: true },
    department: { type: ObjectId, ref: "Department", required: true },
    category: { type: ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, trim: true, maxlength: 64 },
    price: { type: Number, required: true, min: 0 }, // minor units (e.g. kobo)
    costPrice: { type: Number, min: 0, default: null }, // minor units, optional
    trackStock: { type: Boolean, default: true }, // false for services
    stockQuantity: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
productSchema.index(
  { business: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string", $gt: "" } } }
);

export const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
