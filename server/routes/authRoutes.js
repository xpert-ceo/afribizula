import express from "express";
import rateLimit from "express-rate-limit";
import { makeAuthController } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

export default function authRoutes(config) {
  const router = express.Router();
  const c = makeAuthController(config);

  const limiter = rateLimit({
    windowMs: config.authRateLimit.windowMs,
    limit: config.authRateLimit.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
  });

  router.post("/register", limiter, c.registerUser);
  router.post("/login", limiter, c.loginUser);
  router.post("/forgot-password", limiter, c.forgotPassword);
  router.post("/reset-password", limiter, c.resetPassword);
  router.get("/me", protect(config), c.me);
  router.post("/change-password", protect(config), c.changePassword);

  return router;
}
