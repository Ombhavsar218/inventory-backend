import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createUserSchema, updateUserSchema } from "@/validations/user.validation";

const prisma = new PrismaClient();

export async function getAllUsers(_req: Request, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { bills: true, stockItems: true, purchaseOrders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("GetAllUsers error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("GetUserById error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { fullName, email, password, role, isActive } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: "A user with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role,
        isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error("CreateUser error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { fullName, email, password, role, isActive } = result.data;

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        res.status(409).json({ success: false, message: "A user with this email already exists" });
        return;
      }
    }

    const updateData: Record<string, any> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("UpdateUser error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const requestorId = (req as any).userId;
    if (id === requestorId) {
      res.status(400).json({ success: false, message: "You cannot delete your own account" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("DeleteUser error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function toggleUserStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const requestorId = (req as any).userId;
    if (id === requestorId) {
      res.status(400).json({ success: false, message: "You cannot toggle your own status" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("ToggleUserStatus error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}
