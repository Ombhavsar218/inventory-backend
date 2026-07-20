import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import shopRoutes from "@/routes/shop.routes";
import stockRoutes from "@/routes/stock.routes";
import billRoutes from "@/routes/bill.routes";
import dashboardRoutes from "@/routes/dashboard.routes";
import businessProfileRoutes from "@/routes/businessProfile.routes";
import purchaseRoutes from "@/routes/purchase.routes";
import userRoutes from "@/routes/user.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/shops", shopRoutes);
router.use("/stocks", stockRoutes);
router.use("/bills", billRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/business-profile", businessProfileRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/users", userRoutes);

export default router;
