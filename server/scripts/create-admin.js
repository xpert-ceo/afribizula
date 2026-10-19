// Creates (or promotes) the main admin account. Run on a trusted machine:
//   npm run create-admin -- --email admin@example.com --name "Main Admin"
// The password is read from the ADMIN_PASSWORD environment variable or prompted for,
// so it never appears in shell history as an argument.
import dotenv from "dotenv";
import readline from "node:readline/promises";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadConfig } from "../config/env.js";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { passwordProblem, isEmail } from "../utils/validate.js";

dotenv.config({ quiet: true });

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const config = loadConfig();
const email = (arg("email") || "").toLowerCase().trim();
const name = arg("name") || "Main Admin";
if (!isEmail(email)) { console.error("Usage: npm run create-admin -- --email you@example.com [--name 'Main Admin']"); process.exit(1); }

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Admin password (min 8 chars, letters and numbers): ");
  rl.close();
}
const problem = passwordProblem(password);
if (problem) { console.error(problem); process.exit(1); }

await connectDB(config.mongoUri);
const hash = await bcrypt.hash(password, 12);
const existing = await User.findOne({ email });
if (existing) {
  existing.role = "admin"; existing.status = "active"; existing.password = hash;
  existing.onboardingCompleted = true; existing.passwordChangedAt = new Date();
  await existing.save();
  console.log(`Updated ${email} to admin.`);
} else {
  await User.create({ name, email, password: hash, role: "admin", onboardingCompleted: true });
  console.log(`Created admin ${email}.`);
}
await mongoose.disconnect();
