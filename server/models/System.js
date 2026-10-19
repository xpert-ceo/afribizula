import mongoose from "mongoose";

const { ObjectId, Mixed } = mongoose.Schema.Types;

// Key/value platform settings controlled by the main admin (e.g. commission policy).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Mixed, default: null },
    updatedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Append-only record of administrative and sensitive actions.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: "User" },
    action: { type: String, required: true },
    targetType: { type: String },
    targetId: { type: ObjectId },
    details: { type: Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export async function audit(actor, action, targetType, targetId, details) {
  await AuditLog.create({ actor: actor?._id ?? actor ?? null, action, targetType, targetId, details });
}
