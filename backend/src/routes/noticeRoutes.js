import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getNotices, createNotice } from "../controllers/noticeController.js";

const router = Router();

router.get("/", requireAuth, getNotices);
router.post("/", requireAuth, requireRole("admin"), createNotice);

export default router;
