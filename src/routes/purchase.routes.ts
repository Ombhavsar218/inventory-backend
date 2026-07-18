import { Router } from "express";
import { createPurchase, getPurchases, getPurchaseById, updatePurchase, deletePurchase, updateStatus } from "@/controllers/purchase.controller";
import { authenticate } from "@/middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);
router.patch("/:id/status", updateStatus);

export default router;
