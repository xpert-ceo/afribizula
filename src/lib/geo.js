// Country and currency lists generated from the browser's Intl data (global-ready, no hard-coded market).
const NON_COUNTRIES = new Set(["ZZ", "EU", "EZ", "UN", "QO", "XA", "XB"]);
const names = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

export const COUNTRIES = (() => {
  const out = [];
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of A) for (const b of A) {
    const code = a + b;
    if (NON_COUNTRIES.has(code)) continue;
    const name = names.of(code);
    if (name && name !== code) out.push({ code, name });
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
})();

const curNames = new Intl.DisplayNames(["en"], { type: "currency", fallback: "code" });
export const CURRENCIES = Intl.supportedValuesOf("currency").map((code) => ({ code, name: curNames.of(code) }));

// Suggested default currency for common markets; the user can always change it.
export const DEFAULT_CURRENCY = {
  NG: "NGN", GH: "GHS", KE: "KES", ZA: "ZAR", EG: "EGP", RW: "RWF", UG: "UGX", TZ: "TZS", ET: "ETB", MA: "MAD",
  CM: "XAF", SN: "XOF", CI: "XOF", BJ: "XOF", TG: "XOF", ZM: "ZMW", US: "USD", GB: "GBP", CA: "CAD", AE: "AED",
  IN: "INR", FR: "EUR", DE: "EUR", NL: "EUR", IE: "EUR", ES: "EUR", IT: "EUR",
};
