// /api/public — unauthenticated, read-only.
import express from "express";
import { Ambassador } from "../models/Ambassador.js";
import { publicPlans } from "./billingRoutes.js";
import { BILLING_INTERVAL } from "../config/plans.js";

export default function publicRoutes() {
  const router = express.Router();
  router.get("/plans", (_req, res) => res.json({ plans: publicPlans(), interval: BILLING_INTERVAL }));
  router.get("/referral-codes/:code", async (req, res) => {
    const code = String(req.params.code || "").toUpperCase().slice(0, 32);
    const valid = /^[A-Z0-9]{4,32}$/.test(code) && Boolean(await Ambassador.exists({ code, status: "active" }));
    res.json({ code, valid });
  });
  return router;
}
