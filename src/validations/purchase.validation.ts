import { z } from "zod";

const purchaseItemSchema = z.object({
  stockId: z.number().int().positive("Stock item is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  price: z.number().min(0, "Price must be 0 or more"),
});

export const createPurchaseSchema = z.object({
  date: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

export const updatePurchaseSchema = z.object({
  date: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
  status: z.enum(["PENDING", "RECEIVED"]).optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required").optional(),
});

export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
