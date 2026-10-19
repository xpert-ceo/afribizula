import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { Ambassador, Referral } from "../models/Ambassador.js";
import { audit } from "../models/System.js";
import ApiError from "../utils/ApiError.js";
import { collect, str, isEmail, normEmail, passwordProblem } from "../utils/validate.js";
import { randomCode, randomToken, sha256, canonicalEmail } from "../utils/codes.js";
import { signToken } from "../middleware/authMiddleware.js";
import { sessionPayload } from "../services/session.js";
import { mailConfigured, sendMail } from "../services/mailer.js";

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export const hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_ROUNDS);

async function uniqueAmbassadorCode() {
  for (let i = 0; i < 10; i++) {
    const code = randomCode(8);
    if (!(await Ambassador.exists({ code }))) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

export const makeAuthController = (config) => {
  const registerUser = async (req, res) => {
    const v = collect();
    const name = str(req.body?.name);
    const email = normEmail(req.body?.email);
    const password = req.body?.password;
    const accountType = req.body?.accountType || "business";
    const referralCode = str(req.body?.referralCode).toUpperCase();

    if (name.length < 2) v.add("name", "Enter your full name");
    if (name.length > 120) v.add("name", "Name is too long");
    if (!isEmail(email)) v.add("email", "Enter a valid email address");
    const pwErr = passwordProblem(password);
    if (pwErr) v.add("password", pwErr);
    if (!["business", "ambassador"].includes(accountType)) v.add("accountType", "Choose a business or ambassador account");
    if (referralCode && accountType !== "business") v.add("referralCode", "Referral codes apply to business accounts only");
    v.throwIfAny();

    if (await User.exists({ email })) throw ApiError.conflict("An account with this email already exists. Try signing in.");

    let referrer = null;
    if (referralCode) {
      referrer = await Ambassador.findOne({ code: referralCode }).populate("user", "email");
      if (!referrer || referrer.status !== "active")
        throw ApiError.badRequest("Validation failed", { referralCode: "This referral code is not valid or not active" });
      if (referrer.user && canonicalEmail(referrer.user.email) === canonicalEmail(email))
        throw ApiError.badRequest("Validation failed", { referralCode: "You cannot use your own referral code" });
    }

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: accountType === "ambassador" ? "ambassador" : "owner",
      // Ambassadors have no business onboarding.
      onboardingCompleted: accountType === "ambassador",
    });

    try {
      if (accountType === "ambassador") {
        await Ambassador.create({ user: user._id, code: await uniqueAmbassadorCode(), status: "pending" });
      } else if (referrer) {
        await Referral.create({ ambassador: referrer._id, code: referrer.code, referredUser: user._id });
      }
    } catch (e) {
      await User.deleteOne({ _id: user._id }); // keep registration atomic
      throw e;
    }

    res.status(201).json({ token: signToken(user, config), ...(await sessionPayload(user)) });
  };

  const loginUser = async (req, res) => {
    const email = normEmail(req.body?.email);
    const password = req.body?.password;
    if (!isEmail(email) || typeof password !== "string" || !password)
      throw ApiError.badRequest("Enter your email and password");

    const user = await User.findOne({ email }).select("+password");
    const ok = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!ok) throw ApiError.unauthorized("Invalid email or password");
    if (user.status !== "active") throw ApiError.forbidden("This account is suspended. Contact support.");

    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: signToken(user, config), ...(await sessionPayload(user)) });
  };

  const me = async (req, res) => {
    res.json(await sessionPayload(req.user));
  };

  const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user._id).select("+password");
    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password || "")))
      throw ApiError.badRequest("Validation failed", { currentPassword: "Current password is incorrect" });
    const pwErr = passwordProblem(newPassword);
    if (pwErr) throw ApiError.badRequest("Validation failed", { newPassword: pwErr });
    if (newPassword === currentPassword)
      throw ApiError.badRequest("Validation failed", { newPassword: "Choose a different password" });

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: "Password updated", token: signToken(user, config), ...(await sessionPayload(user)) });
  };

  const forgotPassword = async (req, res) => {
    const email = normEmail(req.body?.email);
    if (!isEmail(email)) throw ApiError.badRequest("Validation failed", { email: "Enter a valid email address" });
    if (!mailConfigured(config))
      throw ApiError.unavailable(
        "Password reset by email is not available yet. Please contact Bizula support to reset your password."
      );

    const user = await User.findOne({ email });
    if (user && user.status === "active") {
      const link = await issueResetLink(user, config);
      await sendMail(config, {
        to: user.email,
        subject: "Reset your Bizula password",
        text: `Hello ${user.name || ""},\n\nUse this link to set a new password. It expires in 1 hour:\n${link}\n\nIf you did not request this, you can ignore this email.`,
      });
    }
    // Same response whether or not the account exists (prevents account enumeration).
    res.json({ message: "If an account exists for that email, a reset link has been sent." });
  };

  const resetPassword = async (req, res) => {
    const token = str(req.body?.token);
    const password = req.body?.password;
    if (!/^[a-f\d]{64}$/.test(token)) throw ApiError.badRequest("This reset link is invalid or has expired");
    const pwErr = passwordProblem(password);
    if (pwErr) throw ApiError.badRequest("Validation failed", { password: pwErr });

    const user = await User.findOne({
      passwordResetTokenHash: sha256(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");
    if (!user) throw ApiError.badRequest("This reset link is invalid or has expired");

    user.password = await hashPassword(password);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    await audit(user, "auth.password_reset", "User", user._id);
    res.json({ message: "Your password has been reset. You can now sign in." });
  };

  return { registerUser, loginUser, me, changePassword, forgotPassword, resetPassword };
};

/** Creates a one-time reset token (stored hashed) and returns the user-facing link. */
export async function issueResetLink(user, config) {
  const token = randomToken();
  await User.updateOne(
    { _id: user._id },
    { passwordResetTokenHash: sha256(token), passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) }
  );
  return `${config.appUrl}/reset-password?token=${token}`;
}
