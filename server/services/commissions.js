// Ambassador commission logic.
//
// NO COMMISSION RATE IS HARD-CODED. The rate is a platform setting
// ("commission_policy") that only the main admin can set. Until it is set,
// eligible conversions are recorded with status "awaiting_policy" and amount null,
// so nothing is lost and no financial rule is invented.
//
// Policy shape: { type: "percent" | "fixed", value: number, basis: "first_payment" | "every_payment" }
//   percent: value is 0–100 (% of the subscription payment)
//   fixed:   value is an amount in minor units, in the payment currency
import { Ambassador, Commission, Referral } from "../models/Ambassador.js";
import { Setting } from "../models/System.js";

export const POLICY_KEY = "commission_policy";

export async function getPolicy() {
  const s = await Setting.findOne({ key: POLICY_KEY });
  return s?.value || null;
}

export function policyProblem(p) {
  if (!p || typeof p !== "object") return "Policy is required";
  if (!["percent", "fixed"].includes(p.type)) return "type must be 'percent' or 'fixed'";
  if (!["first_payment", "every_payment"].includes(p.basis)) return "basis must be 'first_payment' or 'every_payment'";
  if (typeof p.value !== "number" || !Number.isFinite(p.value) || p.value < 0) return "value must be a non-negative number";
  if (p.type === "percent" && p.value > 100) return "percent value must be between 0 and 100";
  if (p.type === "fixed" && !Number.isInteger(p.value)) return "fixed value must be an integer amount in minor units";
  return null;
}

export function computeAmount(policy, baseAmount) {
  if (policy.type === "percent") return Math.round((baseAmount * policy.value) / 100);
  return policy.value;
}

/**
 * Called exactly once per successful payment (guarded by the caller).
 * Records the conversion and, when eligible, a commission. Idempotent thanks to
 * the unique index on Commission.payment.
 */
export async function recordConversion(payment, business) {
  const referral = await Referral.findOne({ referredUser: business.owner });
  if (!referral) return null;

  const isFirstPayment = referral.status !== "converted";
  if (isFirstPayment) {
    referral.status = "converted";
    referral.convertedAt = payment.paidAt || new Date();
    if (!referral.business) referral.business = business._id;
    await referral.save();
  }

  const ambassador = await Ambassador.findById(referral.ambassador);
  // Conservative default: no commission accrues while an ambassador is not active.
  if (!ambassador || ambassador.status !== "active") return null;

  const policy = await getPolicy();
  const doc = {
    ambassador: ambassador._id,
    referral: referral._id,
    payment: payment._id,
    isFirstPayment,
    baseAmount: payment.amount,
    currency: payment.currency,
  };

  if (!policy) {
    doc.status = "awaiting_policy";
  } else if (policy.basis === "first_payment" && !isFirstPayment) {
    return null; // not eligible under the current policy
  } else {
    doc.status = "pending";
    doc.policySnapshot = policy;
    doc.amount = computeAmount(policy, payment.amount);
  }

  try {
    return await Commission.create(doc);
  } catch (e) {
    if (e?.code === 11000) return Commission.findOne({ payment: payment._id }); // already recorded
    throw e;
  }
}

/** Applies a newly saved policy to commissions that were waiting for one. */
export async function applyPolicyToAwaiting(policy) {
  const waiting = await Commission.find({ status: "awaiting_policy" });
  let priced = 0;
  let voided = 0;
  for (const c of waiting) {
    if (policy.basis === "first_payment" && !c.isFirstPayment) {
      c.status = "void";
      c.voidReason = "Not eligible under commission policy (first payment only)";
      voided++;
    } else {
      c.status = "pending";
      c.policySnapshot = policy;
      c.amount = computeAmount(policy, c.baseAmount);
      priced++;
    }
    await c.save();
  }
  return { priced, voided };
}
