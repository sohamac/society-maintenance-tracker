import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getDashboard, retryNotifications } from "../controllers/dashboardController.js";

const router = Router();
router.get("/", requireAuth, requireRole("admin"), getDashboard);
router.post("/retry-notifications", requireAuth, requireRole("admin"), retryNotifications);

export default router;
