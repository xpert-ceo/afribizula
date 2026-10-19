// Migration 001: separate business type from user role.
// The first auth system stored business types in User.role
// ("service" | "retail" | "enterprise" | "logistics" | "customer").
// This converts those users to role "owner", keeps the old value in `legacyRole`,
// and lower-cases emails. Idempotent and non-destructive. Dry run by default:
//   npm run migrate:roles            # report only
//   npm run migrate:roles -- --apply # write changes
import dotenv from "dotenv";
import mongoose from "mongoose";
import { loadConfig } from "../config/env.js";

dotenv.config({ quiet: true });
const apply = process.argv.includes("--apply");
const config = loadConfig();
await mongoose.connect(config.mongoUri);
const users = mongoose.connection.collection("users");

const LEGACY = ["service", "retail", "enterprise", "logistics", "customer"];
const legacy = await users.find({ role: { $in: LEGACY } }).project({ _id: 1, role: 1 }).toArray();
const noStatus = await users.countDocuments({ status: { $exists: false } });
const mixedCase = await users.find({ email: { $regex: "[A-Z]" } }).project({ _id: 1, email: 1 }).toArray();

console.log(`Users with legacy role values: ${legacy.length}`);
console.log(`Users without status: ${noStatus}`);
console.log(`Users with upper-case emails: ${mixedCase.length}`);
// Legacy accounts never had a Business document; they must go through onboarding.
const legacyIds = legacy.map((u) => u._id);
const needOnboarding = await users.countDocuments({
  $or: [{ _id: { $in: legacyIds } }, { role: "owner" }],
  business: { $exists: false }, onboardingCompleted: true,
});
console.log(`Owners marked onboarded but without a business: ${needOnboarding}`);

if (apply) {
  for (const u of legacy) await users.updateOne({ _id: u._id }, { $set: { role: "owner", legacyRole: u.role } });
  await users.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });
  await users.updateMany({ role: "owner", business: { $exists: false }, onboardingCompleted: true }, { $set: { onboardingCompleted: false } });
  for (const u of mixedCase) {
    const lower = u.email.toLowerCase();
    if (await users.findOne({ email: lower, _id: { $ne: u._id } })) {
      console.warn(`Skipped ${u._id}: lower-cased email already exists (resolve manually)`);
      continue;
    }
    await users.updateOne({ _id: u._id }, { $set: { email: lower } });
  }
  console.log("Migration applied.");
} else {
  console.log("Dry run only. Re-run with --apply to write changes.");
}
await mongoose.disconnect();
