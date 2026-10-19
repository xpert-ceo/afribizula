// Small, dependency-free request validation helpers.
import mongoose from "mongoose";
import ApiError from "./ApiError.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function collect() {
  const errors = {};
  return {
    errors,
    add(field, msg) { if (!errors[field]) errors[field] = msg; },
    throwIfAny(message = "Please correct the highlighted fields") {
      if (Object.keys(errors).length) throw ApiError.badRequest(message, errors);
    },
  };
}

export const str = (v) => (typeof v === "string" ? v.trim() : "");
export const isEmail = (v) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v.trim());
export const normEmail = (v) => str(v).toLowerCase();
export const isObjectId = (v) => typeof v === "string" && mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v);

export function requireObjectId(v, name = "id") {
  if (!isObjectId(v)) throw ApiError.badRequest(`Invalid ${name}`);
  return v;
}

export function passwordProblem(pw) {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password must be at most 128 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain at least one letter and one number";
  return null;
}

/** Non-negative integer amount in minor units (e.g. kobo). */
export const isMoney = (v) => Number.isInteger(v) && v >= 0 && v <= 1e13;
export const isNonNegInt = (v) => Number.isInteger(v) && v >= 0 && v <= 1e9;

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function paging(query, { defLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}
