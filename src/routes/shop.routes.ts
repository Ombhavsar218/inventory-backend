import { Router } from "express";
import { createShop, getShops, getShopById, updateShop, deleteShop } from "@/controllers/shop.controller";
import { authenticate } from "@/middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.post("/", createShop);
router.get("/", getShops);
router.get("/:id", getShopById);
router.put("/:id", updateShop);
router.delete("/:id", deleteShop);

export default router;
