// Subscription plans.
//
// PRICES ARE NOT YET CONFIRMED BY THE PRODUCT OWNER.
// The amounts below are copied from the public marketing page
// (src/Sections/Pricing.jsx: Service ₦6,000, Retail ₦10,000, Enterprise ₦20,000).
// Billing is monthly only (agreed decision). No free trial is implemented because
// trial rules have not been agreed. Amounts are stored in the currency's minor unit
// (kobo for NGN), which is what Paystack expects.
//
// Plans do not currently gate features: every plan unlocks the same MVP feature set,
// because the per-tier feature split advertised on the marketing page (bookings,
// logistics, B2B marketplace…) is not implemented yet. See docs/HANDOVER.md.

export const BILLING_INTERVAL = "monthly";

export const PLANS = {
  service: {
    id: "service",
    name: "Service",
    amount: 600000,
    currency: "NGN",
    interval: BILLING_INTERVAL,
    priceConfirmed: false,
  },
  retail: {
    id: "retail",
    name: "Retail",
    amount: 1000000,
    currency: "NGN",
    interval: BILLING_INTERVAL,
    priceConfirmed: false,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    amount: 2000000,
    currency: "NGN",
    interval: BILLING_INTERVAL,
    priceConfirmed: false,
  },
};

export const PLAN_IDS = Object.keys(PLANS);

export const getPlan = (id) => PLANS[id] || null;
