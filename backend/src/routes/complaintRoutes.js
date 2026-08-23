import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createComplaint,
  getMyComplaints,
  getComplaintHistory,
  getAllComplaints,
  updateComplaint,
} from "../controllers/complaintController.js";

const router = Router();

router.use(requireAuth);

// Resident routes
router.post("/", requireRole("resident"), upload.single("photo"), createComplaint);
router.get("/mine", requireRole("resident"), getMyComplaints);

// Shared
router.get("/:id/history", getComplaintHistory);

// Admin routes
router.get("/", requireRole("admin"), getAllComplaints);
router.patch("/:id", requireRole("admin"), updateComplaint);

export default router;
