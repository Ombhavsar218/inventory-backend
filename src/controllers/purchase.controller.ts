import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createPurchaseSchema, updatePurchaseSchema } from "@/validations/purchase.validation";

const prisma = new PrismaClient();

export async function createPurchase(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const result = createPurchaseSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { date, invoiceNumber, paidAmount, items } = result.data;

    const purchase = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      for (const item of items) {
        const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
        if (!stock) {
          throw new Error(`Stock item with id ${item.stockId} not found`);
        }
        totalAmount += item.price * item.quantity;
      }

      const poCount = await tx.purchaseOrder.count();
      const autoInvoiceNumber = invoiceNumber || `PO-${String(poCount + 1).padStart(4, "0")}`;

      const paid = paidAmount || 0;
      const due = totalAmount - paid;

      const created = await tx.purchaseOrder.create({
        data: {
          invoiceNumber: autoInvoiceNumber,
          date: date ? new Date(date) : new Date(),
          totalAmount,
          paidAmount: paid,
          dueAmount: due,
          createdBy: userId,
          items: {
            create: items.map((item) => ({
              stockId: item.stockId,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
            })),
          },
        },
        include: {
          items: { include: { stock: { select: { id: true, name: true, sku: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
          creator: { select: { id: true, fullName: true, role: true } },
        },
      });

      for (const item of items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      return created;
    });

    res.status(201).json({ success: true, purchase });
  } catch (error: any) {
    console.error("Create purchase error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create purchase order" });
  }
}

export async function getPurchases(req: Request, res: Response): Promise<void> {
  try {
    const { date, status } = req.query;

    const where: any = {};
    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }
    if (status) {
      where.status = status as string;
    }

    const purchases = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: { include: { stock: { select: { id: true, name: true, sku: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, purchases });
  } catch (error) {
    console.error("Get purchases error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchase orders" });
  }
}

export async function getPurchaseById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);

    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { stock: { select: { id: true, name: true, sku: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!purchase) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    res.status(200).json({ success: true, purchase });
  } catch (error) {
    console.error("Get purchase error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchase order" });
  }
}

export async function updatePurchase(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    if (userRole !== "OWNER" && existing.createdBy !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const result = updatePurchaseSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { date, invoiceNumber, paidAmount, status, items: newItems } = result.data;

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      let totalAmount = existing.totalAmount;
      let itemsData: { purchaseOrderId: number; stockId: number; quantity: number; unit: string; price: number }[] = [];

      if (newItems) {
        totalAmount = 0;
        itemsData = [];

        for (const item of newItems) {
          const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
          if (!stock) {
            throw new Error(`Stock item with id ${item.stockId} not found`);
          }
          totalAmount += item.price * item.quantity;
          itemsData.push({
            purchaseOrderId: id,
            stockId: item.stockId,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
          });
        }

        await tx.purchaseOrderItem.createMany({ data: itemsData });

        for (const item of newItems) {
          await tx.stock.update({
            where: { id: item.stockId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      const paid = paidAmount ?? existing.paidAmount;
      const due = totalAmount - paid;

      const finalPurchase = await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(date && { date: new Date(date) }),
          ...(invoiceNumber !== undefined && { invoiceNumber }),
          ...(newItems && { totalAmount, paidAmount: paid, dueAmount: due }),
          ...(paidAmount !== undefined && !newItems && { paidAmount: paid, dueAmount: totalAmount - paid }),
          ...(status && { status }),
        },
        include: {
          items: { include: { stock: true } },
          creator: { select: { id: true, fullName: true, role: true } },
        },
      });

      return finalPurchase;
    });

    res.status(200).json({ success: true, purchase: updated });
  } catch (error: any) {
    console.error("Update purchase error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update purchase order" });
  }
}

export async function deletePurchase(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const id = parseInt(req.params.id as string);

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    if (userRole !== "OWNER" && existing.createdBy !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrder.delete({ where: { id } });
    });

    res.status(200).json({ success: true, message: "Purchase order deleted successfully" });
  } catch (error: any) {
    console.error("Delete purchase error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete purchase order" });
  }
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    if (!status || !["PENDING", "RECEIVED"].includes(status)) {
      res.status(400).json({ success: false, message: "Status must be PENDING or RECEIVED" });
      return;
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Purchase order not found" });
      return;
    }

    const purchase = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        items: { include: { stock: { select: { id: true, name: true, sku: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
      },
    });

    res.status(200).json({ success: true, purchase });
  } catch (error: any) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update status" });
  }
}
