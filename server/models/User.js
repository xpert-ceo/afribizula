import mongoose from "mongoose";

// Platform roles. Business *type* (retail/service) lives on Business, not here.
// Legacy documents created by the earlier auth system may have role values
// "service" | "retail" | "enterprise" | "logistics" | "customer" — run
// `npm run migrate:roles` (server/scripts/migrate-001-roles.js) to convert them.
export const ROLES = ["owner", "staff", "ambassador", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, select: false },
    provider: { type: String, default: "email" },
    role: { type: String, enum: ROLES, default: "owner" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", index: true },
    avatar: { type: String },
    onboardingCompleted: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
    legacyRole: { type: String }, // populated by migration 001 only
  },
  { timestamps: true }
);

/** The only shape of a user that may leave the API. Never includes password or reset data. */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    provider: this.provider,
    business: this.business?._id ?? this.business ?? null,
    onboardingCompleted: this.onboardingCompleted,
    mustChangePassword: this.mustChangePassword,
    createdAt: this.createdAt,
  };
};

export const SAFE_USER_FIELDS = "name email role status provider business onboardingCompleted mustChangePassword createdAt lastLoginAt";

export default mongoose.models.User || mongoose.model("User", userSchema);
