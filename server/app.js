import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import { businessRoutes, staffRoutes } from "./routes/businessRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import { billingRoutes, billingWebhook } from "./routes/billingRoutes.js";
import ambassadorRoutes from "./routes/ambassadorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { dbState } from "./config/db.js";

export function createApp(config) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  app.use(
    // CORS headers alone only stop a browser from *reading* a response; the request is
    // still processed. Refuse requests from browser origins that are not allow-listed.
    (req, res, next) => {
      const origin = req.headers.origin;
      if (origin && !config.clientUrls.includes(origin.replace(/\/$/, ""))) {
        return res.status(403).json({ message: "Origin not allowed" });
      }
      next();
    },
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (no Origin header) and the configured frontends only.
        if (!origin || config.clientUrls.includes(origin.replace(/\/$/, ""))) return cb(null, true);
        return cb(null, false);
      },
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  );

  // Webhook needs the raw body for signature verification, so it is mounted before express.json().
  app.use("/api/billing/webhook", billingWebhook(config));
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => res.send("Bizula API Running..."));
  app.get("/api/health", (_req, res) => {
    const db = dbState();
    res.status(db === "connected" ? 200 : 503).json({ status: db === "connected" ? "ok" : "degraded", db });
  });

  app.use("/api/public", publicRoutes(config));
  app.use("/api/auth", authRoutes(config));
  app.use("/api/business", businessRoutes(config));
  app.use("/api/staff", staffRoutes(config));
  app.use("/api/inventory", inventoryRoutes(config));
  app.use("/api/sales", salesRoutes(config));
  app.use("/api/billing", billingRoutes(config));
  app.use("/api/ambassador", ambassadorRoutes(config));
  app.use("/api/admin", adminRoutes(config));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp;
