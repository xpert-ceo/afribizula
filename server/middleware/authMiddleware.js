import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Business from "../models/Business.js";
import ApiError from "../utils/ApiError.js";

export function signToken(user, config) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/**
 * Verifies the Bearer token, then reloads the user from the database on every
 * request so that suspensions, role changes and password resets take effect
 * immediately (the role inside the token is never trusted for authorization).
 */
export const protect = (config) => async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized("Your session has expired or is invalid. Please sign in again.");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Account no longer exists");
  if (user.status !== "active") throw ApiError.forbidden("This account is suspended. Contact support.");
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw ApiError.unauthorized("Your password was changed. Please sign in again.");
  }

  req.user = user;
  next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!roles.includes(req.user.role)) throw ApiError.forbidden();
  next();
};

/**
 * Loads the caller's business (owners and staff only) into req.business.
 * The business id always comes from the authenticated user, never from the client.
 */
export const loadBusiness = ({ requireOnboarded = true } = {}) => async (req, _res, next) => {
  if (!["owner", "staff"].includes(req.user.role)) throw ApiError.forbidden("Business accounts only");
  if (!req.user.business) {
    throw new ApiError(409, "Complete onboarding to set up your business first", { code: "ONBOARDING_REQUIRED" });
  }
  const business = await Business.findById(req.user.business);
  if (!business) throw new ApiError(409, "Business not found. Complete onboarding.", { code: "ONBOARDING_REQUIRED" });
  if (business.status !== "active") throw ApiError.forbidden("This business is suspended. Contact support.");
  if (requireOnboarded && req.user.role === "owner" && !req.user.onboardingCompleted) {
    throw new ApiError(409, "Complete onboarding first", { code: "ONBOARDING_REQUIRED" });
  }
  req.business = business;
  next();
};

/** Optional gate for write actions when SUBSCRIPTION_ENFORCEMENT=true. */
export const requireActiveSubscription = (config) => (req, _res, next) => {
  if (!config.subscriptionEnforcement) return next();
  if (req.business.subscriptionView().status !== "active") {
    throw new ApiError(402, "An active subscription is required for this action", { code: "SUBSCRIPTION_REQUIRED" });
  }
  next();
};
