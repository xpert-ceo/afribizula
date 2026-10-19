import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function randomCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** Canonical mailbox for self-referral checks: lower-case, strip +tags, ignore dots for Gmail. */
export function canonicalEmail(email) {
  const [local = "", domain = ""] = String(email).toLowerCase().trim().split("@");
  let l = local.split("+")[0];
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  if (d === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${d}`;
}
