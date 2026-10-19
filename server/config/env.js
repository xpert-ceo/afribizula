// Centralised, validated configuration. Fails fast with a readable message
// instead of crashing later with an obscure error.

export class ConfigError extends Error {}

const bool = (v, def = false) =>
  v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(String(v).toLowerCase());

const int = (v, def) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";
  const problems = [];

  if (!env.MONGO_URI) problems.push("MONGO_URI is not set (MongoDB connection string).");
  if (!env.JWT_SECRET) problems.push("JWT_SECRET is not set (long random string used to sign login tokens).");
  else if (isProd && env.JWT_SECRET.length < 32)
    problems.push("JWT_SECRET must be at least 32 characters in production.");

  const clientUrls = (env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (isProd && !env.CLIENT_URL) problems.push("CLIENT_URL must list the allowed frontend origin(s) in production.");

  if (problems.length) {
    throw new ConfigError(
      "Bizula API configuration error:\n  - " +
        problems.join("\n  - ") +
        "\nCopy server/.env.example to server/.env and fill in the values."
    );
  }

  return {
    nodeEnv,
    isProd,
    isTest: nodeEnv === "test",
    port: int(env.PORT, 5000),
    mongoUri: env.MONGO_URI,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || "7d",
    clientUrls,
    appUrl: (env.APP_URL || clientUrls[0]).replace(/\/$/, ""),
    trustProxy: int(env.TRUST_PROXY, 0),
    paystack: {
      secretKey: env.PAYSTACK_SECRET_KEY || "",
      baseUrl: (env.PAYSTACK_BASE_URL || "https://api.paystack.co").replace(/\/$/, ""),
    },
    subscriptionEnforcement: bool(env.SUBSCRIPTION_ENFORCEMENT, false),
    smtp: {
      host: env.SMTP_HOST || "",
      port: int(env.SMTP_PORT, 587),
      secure: bool(env.SMTP_SECURE, false),
      user: env.SMTP_USER || "",
      pass: env.SMTP_PASS || "",
      from: env.MAIL_FROM || "Bizula <no-reply@example.com>",
      // Test-only: use nodemailer's JSON transport (no network).
      jsonTransport: env.MAIL_TRANSPORT === "json",
    },
    authRateLimit: {
      max: int(env.AUTH_RATE_LIMIT_MAX, 20),
      windowMs: int(env.AUTH_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    },
  };
}
