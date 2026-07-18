import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { shopSchema } from "@/validations/shop.validation";

const prisma = new PrismaClient();

export async function createShop(req: Request, res: Response): Promise<void> {
  try {
    const result = shopSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { name, address, gstNo, fssaiNo, phone, email, stateCode } = result.data;
    const userId = (req as any).userId;

    const shop = await prisma.shop.create({
      data: {
        name,
        address,
        gstNo: gstNo || null,
        fssaiNo: fssaiNo || null,
        phone: phone || null,
        email: email || null,
        stateCode: stateCode || null,
        ownerId: userId,
      },
    });

    res.status(201).json({ success: true, shop });
  } catch (error) {
    console.error("Create shop error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function getShops(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    const shops = await prisma.shop.findMany({
      where: {},
      include: { owner: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, shops });
  } catch (error) {
    console.error("Get shops error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function getShopById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const shop = await prisma.shop.findUnique({
      where: { id: Number(id) },
      include: { owner: { select: { id: true, fullName: true } } },
    });

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }

    res.status(200).json({ success: true, shop });
  } catch (error) {
    console.error("Get shop error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function updateShop(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const shop = await prisma.shop.findUnique({ where: { id: Number(id) } });

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }

    if (shop.ownerId !== userId) {
      res.status(403).json({ success: false, message: "You can only edit your own shops" });
      return;
    }

    const result = shopSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { name, address, gstNo, fssaiNo, phone, email, stateCode } = result.data;

    const updated = await prisma.shop.update({
      where: { id: Number(id) },
      data: {
        name,
        address,
        gstNo: gstNo || null,
        fssaiNo: fssaiNo || null,
        phone: phone || null,
        email: email || null,
        stateCode: stateCode || null,
      },
    });

    res.status(200).json({ success: true, shop: updated });
  } catch (error) {
    console.error("Update shop error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function deleteShop(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const shop = await prisma.shop.findUnique({ where: { id: Number(id) } });

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }

    if (shop.ownerId !== userId) {
      res.status(403).json({ success: false, message: "You can only delete your own shops" });
      return;
    }

    await prisma.shop.delete({ where: { id: Number(id) } });

    res.status(200).json({ success: true, message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Delete shop error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}
