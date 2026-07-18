import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createBillSchema, updateBillSchema } from "@/validations/bill.validation";

const prisma = new PrismaClient();

export async function createBill(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const result = createBillSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { shopId, date, items } = result.data;

    const bill = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;

      for (const item of items) {
        const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
        if (!stock) {
          throw new Error(`Stock item with id ${item.stockId} not found`);
        }
        if (stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${stock.name}". Available: ${stock.quantity}, requested: ${item.quantity}`);
        }
        totalAmount += item.price * item.quantity;
      }

      const billCount = await tx.bill.count();
      const invoiceNumber = `INV-${String(billCount + 1).padStart(4, "0")}`;

      const createdBill = await tx.bill.create({
        data: {
          invoiceNumber,
          shopId,
          date: date ? new Date(date) : new Date(),
          totalAmount,
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
          shop: { select: { id: true, name: true, address: true, gstNo: true, fssaiNo: true, phone: true, email: true, stateCode: true } },
        },
      });

      for (const item of items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return createdBill;
    });

    res.status(201).json({ success: true, bill });
  } catch (error: any) {
    console.error("Create bill error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create bill" });
  }
}

export async function getBills(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    const where = userRole === "OWNER" ? {} : { createdBy: userId };

    const bills = await prisma.bill.findMany({
      where,
      include: {
        items: { include: { stock: { select: { id: true, name: true, unit: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, bills });
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bills" });
  }
}

export async function getBillById(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const billId = parseInt(req.params.id as string);

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: { include: { stock: { select: { id: true, name: true, sku: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
        shop: { select: { id: true, name: true, address: true, gstNo: true, fssaiNo: true, phone: true, email: true, stateCode: true } },
      },
    });

    if (!bill) {
      res.status(404).json({ success: false, message: "Bill not found" });
      return;
    }

    if (userRole !== "OWNER" && bill.createdBy !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    res.status(200).json({ success: true, bill });
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bill" });
  }
}

export async function updateBill(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const billId = parseInt(req.params.id as string);

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { items: true },
    });

    if (!bill) {
      res.status(404).json({ success: false, message: "Bill not found" });
      return;
    }

    if (userRole !== "OWNER" && bill.createdBy !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const result = updateBillSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message: errorMessage });
      return;
    }

    const { shopId, date, items: newItems } = result.data;

    const updatedBill = await prisma.$transaction(async (tx) => {
      for (const item of bill.items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.billItem.deleteMany({ where: { billId } });

      let totalAmount = 0;

      if (newItems) {
        for (const item of newItems) {
          const stock = await tx.stock.findUnique({ where: { id: item.stockId } });
          if (!stock) {
            throw new Error(`Stock item with id ${item.stockId} not found`);
          }
          if (stock.quantity < item.quantity) {
            throw new Error(`Insufficient stock for "${stock.name}". Available: ${stock.quantity}, requested: ${item.quantity}`);
          }
          totalAmount += item.price * item.quantity;
        }

        await tx.billItem.createMany({
          data: newItems.map((item) => ({
            billId,
            stockId: item.stockId,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
          })),
        });

        for (const item of newItems) {
          await tx.stock.update({
            where: { id: item.stockId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      const finalBill = await tx.bill.update({
        where: { id: billId },
        data: {
          ...(shopId && { shopId }),
          ...(date && { date: new Date(date) }),
          ...(newItems && { totalAmount }),
        },
        include: {
          items: { include: { stock: true } },
          creator: { select: { id: true, fullName: true, role: true } },
          shop: true,
        },
      });

      return finalBill;
    });

    res.status(200).json({ success: true, bill: updatedBill });
  } catch (error: any) {
    console.error("Update bill error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update bill" });
  }
}

export async function getGroupedBills(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await prisma.bill.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        items: { include: { stock: { select: { id: true, name: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
        shop: { select: { id: true, name: true, address: true, gstNo: true, fssaiNo: true, phone: true, email: true, stateCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const grouped: Record<number, { shopId: number; shopName: string; totalAmount: number; totalItems: number; billsCount: number; bills: typeof bills }> = {};

    for (const bill of bills) {
      const key = bill.shopId;
      if (!grouped[key]) {
        grouped[key] = {
          shopId: bill.shopId,
          shopName: bill.shop.name,
          totalAmount: 0,
          totalItems: 0,
          billsCount: 0,
          bills: [],
        };
      }
      grouped[key].totalAmount += bill.totalAmount;
      grouped[key].totalItems += bill.items.length;
      grouped[key].billsCount += 1;
      grouped[key].bills.push(bill);
    }

    const result = Object.values(grouped).sort((a, b) => b.totalAmount - a.totalAmount);

    res.status(200).json({ success: true, groups: result });
  } catch (error) {
    console.error("Get grouped bills error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch grouped bills" });
  }
}

export async function getShopBills(req: Request, res: Response): Promise<void> {
  try {
    const shopId = parseInt(req.params.shopId as string);
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await prisma.bill.findMany({
      where: {
        shopId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        items: { include: { stock: { select: { id: true, name: true, unit: true, mrp: true, hsnCode: true, gstRate: true } } } },
        creator: { select: { id: true, fullName: true, role: true } },
        shop: { select: { id: true, name: true, address: true, gstNo: true, fssaiNo: true, phone: true, email: true, stateCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const allItems: {
      stockName: string;
      quantity: number;
      unit: string;
      price: number;
      subtotal: number;
      createdBy: string;
      billId: number;
      mrp: number | null;
      hsnCode: string | null;
      gstRate: number | null;
    }[] = [];

    let totalAmount = 0;
    for (const bill of bills) {
      for (const item of bill.items) {
        allItems.push({
          stockName: item.stock.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          subtotal: item.price * item.quantity,
          createdBy: bill.creator.fullName,
          billId: bill.id,
          mrp: item.stock.mrp,
          hsnCode: item.stock.hsnCode,
          gstRate: item.stock.gstRate,
        });
        totalAmount += item.price * item.quantity;
      }
    }

    const shop = bills.length > 0 ? bills[0].shop : null;

    res.status(200).json({
      success: true,
      shop,
      date: targetDate.toISOString().split("T")[0],
      totalAmount,
      totalItems: allItems.length,
      items: allItems,
      billsCount: bills.length,
    });
  } catch (error) {
    console.error("Get shop bills error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch shop bills" });
  }
}

export async function deleteBill(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const billId = parseInt(req.params.id as string);

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { items: true },
    });

    if (!bill) {
      res.status(404).json({ success: false, message: "Bill not found" });
      return;
    }

    if (userRole !== "OWNER" && bill.createdBy !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const item of bill.items) {
        await tx.stock.update({
          where: { id: item.stockId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.bill.delete({ where: { id: billId } });
    });

    res.status(200).json({ success: true, message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Delete bill error:", error);
    res.status(500).json({ success: false, message: "Failed to delete bill" });
  }
}
