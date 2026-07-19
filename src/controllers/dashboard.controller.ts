import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const userRole = (req as any).userRole;
    if (userRole !== "OWNER") {
      res.status(403).json({ success: false, message: "Only owners can access dashboard" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthParam = req.query.month as string | undefined;
    let chartStart: Date;
    let chartEnd: Date;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      chartStart = new Date(year, month - 1, 1);
      chartEnd = new Date(year, month, 1);
    } else {
      chartStart = new Date(today.getFullYear(), today.getMonth(), 1);
      chartEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    const daysInMonth = new Date(chartEnd.getFullYear(), chartEnd.getMonth(), 0).getDate();

    const [
      totalShops,
      totalStockItems,
      todayBills,
      todayRevenue,
      totalRevenue,
      allStocks,
      chartBills,
      recentBills,
      rawTopSelling,
    ] = await Promise.all([
      prisma.shop.count(),
      prisma.stock.count(),
      prisma.bill.count({ where: { date: { gte: today, lt: tomorrow } } }),
      prisma.bill.aggregate({
        _sum: { totalAmount: true },
        where: { date: { gte: today, lt: tomorrow } },
      }),
      prisma.bill.aggregate({ _sum: { totalAmount: true } }),
      prisma.stock.findMany({
        where: { minStock: { gt: 0 } },
        select: {
          id: true,
          name: true,
          quantity: true,
          minStock: true,
          unit: true,
        },
      }),
      prisma.bill.findMany({
        where: { date: { gte: chartStart, lt: chartEnd } },
        select: { date: true, totalAmount: true },
      }),
      prisma.bill.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          totalAmount: true,
          date: true,
          shop: { select: { id: true, name: true } },
          creator: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.billItem.groupBy({
        by: ["stockId"],
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    const lowStockItems = allStocks
      .filter((s) => s.quantity <= s.minStock)
      .sort((a, b) => a.quantity - b.quantity);

    const dailyMap = new Map<number, { totalAmount: number; billsCount: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap.set(d, { totalAmount: 0, billsCount: 0 });
    }
    for (const bill of chartBills) {
      const day = new Date(bill.date).getDate();
      const existing = dailyMap.get(day)!;
      existing.totalAmount += bill.totalAmount;
      existing.billsCount += 1;
    }

    const dailySales = Array.from(dailyMap.entries()).map(([day, data]) => ({
      day,
      totalAmount: data.totalAmount,
      billsCount: data.billsCount,
    }));

    const stockIds = rawTopSelling.map((t) => t.stockId);
    const stockDetails = await prisma.stock.findMany({
      where: { id: { in: stockIds } },
      select: { id: true, name: true, unit: true, price: true },
    });
    const stockMap = new Map(stockDetails.map((s) => [s.id, s]));

    const topSellingItems = rawTopSelling.map((t) => {
      const stock = stockMap.get(t.stockId);
      const qty = t._sum.quantity || 0;
      return {
        stockId: t.stockId,
        name: stock?.name || "Unknown",
        unit: stock?.unit || "pcs",
        totalQuantity: qty,
        revenue: stock ? stock.price * qty : 0,
      };
    });

    res.json({
      success: true,
      totalShops,
      totalStockItems,
      todayBills,
      todayRevenue: todayRevenue._sum.totalAmount || 0,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      lowStockItems,
      dailySales,
      recentBills: recentBills.map((b) => ({
        id: b.id,
        shopId: b.shop.id,
        shopName: b.shop.name,
        totalAmount: b.totalAmount,
        itemsCount: b._count.items,
        creator: b.creator.fullName,
        date: b.date,
      })),
      topSellingItems,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard stats" });
  }
}
