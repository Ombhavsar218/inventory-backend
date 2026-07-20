import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "@/controllers/user.controller";

const router = Router();

router.use(authenticate);
router.use(requireRole("SUPERADMIN"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.patch("/:id/toggle-status", toggleUserStatus);

export default router;
