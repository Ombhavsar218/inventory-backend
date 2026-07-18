import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { createBill, getBills, getGroupedBills, getShopBills, getBillById, updateBill, deleteBill } from "@/controllers/bill.controller";

const router = Router();

router.use(authenticate);

router.post("/", createBill);
router.get("/", getBills);
router.get("/grouped", getGroupedBills);
router.get("/shop/:shopId", getShopBills);
router.get("/:id", getBillById);
router.put("/:id", updateBill);
router.delete("/:id", deleteBill);

export default router;
