import Business from "../models/Business.js";
import Payment from "../models/Payment.js";
import { getPlan } from "../config/plans.js";
import { recordConversion } from "./commissions.js";

export function addOneMonth(date) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() < day) d.setUTCDate(0); // clamp e.g. Jan 31 -> Feb 28/29
  return d;
}

/**
 * Applies a provider-verified transaction to our records. Safe to call more than
 * once for the same reference (verify redirect + webhook): only the first call
 * that flips the payment from "initialized" to "success" extends the subscription.
 */
export async function applyVerifiedTransaction(tx, via) {
  const payment = await Payment.findOne({ reference: tx.reference });
  if (!payment) return { ok: false, reason: "unknown_reference" };
  if (payment.status === "success") return { ok: true, payment, alreadyProcessed: true };

  if (tx.status !== "success") {
    await Payment.updateOne({ _id: payment._id, status: "initialized" }, { status: "failed", failureReason: `Provider status: ${tx.status}` });
    return { ok: false, reason: "not_successful", payment };
  }

  const plan = getPlan(payment.plan);
  // Never trust the client: the amount and currency must match what we asked for.
  if (!plan || tx.amount !== payment.amount || String(tx.currency).toUpperCase() !== payment.currency) {
    await Payment.updateOne(
      { _id: payment._id, status: "initialized" },
      { status: "failed", failureReason: `Amount/currency mismatch: got ${tx.amount} ${tx.currency}` }
    );
    return { ok: false, reason: "amount_mismatch", payment };
  }

  // Atomic claim: only one concurrent caller can transition initialized -> success.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "initialized" },
    { status: "success", paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), processedVia: via },
    { new: true }
  );
  if (!claimed) return { ok: true, payment: await Payment.findById(payment._id), alreadyProcessed: true };

  const business = await Business.findById(claimed.business);
  const now = new Date();
  const currentEnd = business.subscription?.currentPeriodEnd;
  const start = currentEnd && currentEnd > now ? currentEnd : now;
  const end = addOneMonth(start);

  business.subscription = { plan: claimed.plan, status: "active", currentPeriodEnd: end, lastPaymentAt: claimed.paidAt };
  await business.save();

  claimed.periodStart = start;
  claimed.periodEnd = end;
  await claimed.save();

  await recordConversion(claimed, business);
  return { ok: true, payment: claimed };
}
