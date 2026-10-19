import Business from "../models/Business.js";
import { Ambassador } from "../models/Ambassador.js";

/** Everything the frontend needs to route a signed-in user. Contains no secrets. */
export async function sessionPayload(user) {
  const out = { user: user.toSafeJSON(), business: null, ambassador: null };
  if (user.business) {
    const b = await Business.findById(user.business);
    if (b)
      out.business = {
        _id: b._id,
        name: b.name,
        type: b.type,
        country: b.country,
        currency: b.currency,
        status: b.status,
        settings: b.settings,
        subscription: b.subscriptionView(),
      };
  }
  if (user.role === "ambassador") {
    const a = await Ambassador.findOne({ user: user._id });
    if (a) out.ambassador = { _id: a._id, code: a.code, status: a.status };
  }
  return out;
}
