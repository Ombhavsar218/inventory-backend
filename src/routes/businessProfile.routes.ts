import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { getBusinessProfile, updateBusinessProfile } from "@/controllers/businessProfile.controller";

const router = Router();

router.use(authenticate);

router.get("/", getBusinessProfile);
router.put("/", updateBusinessProfile);

export default router;
