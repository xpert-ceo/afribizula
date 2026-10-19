// Money is stored by the API as integers in the currency's minor unit (e.g. kobo).

export function currencyDigits(currency = "NGN") {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

export function formatMoney(minor, currency = "NGN") {
  if (minor === null || minor === undefined) return "—";
  const digits = currencyDigits(currency);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 10 ** digits);
  } catch {
    return `${currency} ${(minor / 10 ** digits).toFixed(digits)}`;
  }
}

/** Parses a user-entered amount ("1,500.50") into minor units, or null if invalid. */
export function toMinor(input, currency = "NGN") {
  const s = String(input ?? "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const digits = currencyDigits(currency);
  return Math.round(Number(s) * 10 ** digits);
}

export const fromMinor = (minor, currency = "NGN") =>
  minor === null || minor === undefined ? "" : String(minor / 10 ** currencyDigits(currency));

export function formatDate(d, withTime = false) {
  if (!d) return "—";
  const date = new Date(d);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}
