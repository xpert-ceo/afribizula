import { formatMoney } from "./format";

/** Human description of the admin-set commission policy, or null if none is set. */
export function describePolicy(policy, currency = "NGN") {
  if (!policy) return null;
  const amount = policy.type === "percent" ? `${policy.value}% of each qualifying subscription payment` : `${formatMoney(policy.value, currency)} per qualifying subscription payment`;
  const basis = policy.basis === "first_payment" ? "the referred business's first payment only" : "every subscription payment made by the referred business";
  return `${amount}, paid on ${basis}.`;
}
