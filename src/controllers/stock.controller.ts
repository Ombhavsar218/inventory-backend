import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { stockSchema } from "@/validations/stock.validation";

const prisma = new PrismaClient();

export async function createStock(req: Request, res: Response): Promise<void> {
  try {
    const result = stockSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { name, sku, quantity, unit, price, mrp, hsnCode, gstRate, minStock, description } = result.data;
    const userId = (req as any).userId;

    const stock = await prisma.stock.create({
      data: {
        name,
        sku: sku || null,
        quantity,
        unit,
        price,
        mrp: mrp ?? null,
        hsnCode: hsnCode || null,
        gstRate: gstRate ?? null,
        minStock: minStock ?? 0,
        description: description || null,
        ownerId: userId,
      },
    });

    res.status(201).json({ success: true, stock });
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function getStocks(req: Request, res: Response): Promise<void> {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, stocks });
  } catch (error) {
    console.error("Get stocks error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function getStockById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const stock = await prisma.stock.findUnique({
      where: { id: Number(id) },
    });

    if (!stock) {
      res.status(404).json({ success: false, message: "Stock item not found" });
      return;
    }

    res.status(200).json({ success: true, stock });
  } catch (error) {
    console.error("Get stock error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function updateStock(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const existing = await prisma.stock.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Stock item not found" });
      return;
    }
    if (existing.ownerId !== userId) {
      res.status(403).json({ success: false, message: "You can only edit your own stock items" });
      return;
    }

    const result = stockSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { name, sku, quantity, unit, price, mrp, hsnCode, gstRate, minStock, description } = result.data;

    const stock = await prisma.stock.update({
      where: { id: Number(id) },
      data: {
        name,
        sku: sku || null,
        quantity,
        unit,
        price,
        mrp: mrp ?? null,
        hsnCode: hsnCode || null,
        gstRate: gstRate ?? null,
        minStock: minStock ?? 0,
        description: description || null,
      },
    });

    res.status(200).json({ success: true, stock });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}

export async function deleteStock(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    const existing = await prisma.stock.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Stock item not found" });
      return;
    }
    if (existing.ownerId !== userId) {
      res.status(403).json({ success: false, message: "You can only delete your own stock items" });
      return;
    }

    await prisma.stock.delete({ where: { id: Number(id) } });

    res.status(200).json({ success: true, message: "Stock item deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ success: false, message: "An internal server error occurred" });
  }
}
