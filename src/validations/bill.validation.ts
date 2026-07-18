import { z } from "zod";

const billItemSchema = z.object({
  stockId: z.number().int().positive("Stock item is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  price: z.number().min(0, "Price must be 0 or more"),
});

export const createBillSchema = z.object({
  shopId: z.number().int().positive("Shop is required"),
  date: z.string().optional(),
  items: z.array(billItemSchema).min(1, "At least one item is required"),
});

export const updateBillSchema = z.object({
  shopId: z.number().int().positive("Shop is required").optional(),
  date: z.string().optional(),
  items: z.array(billItemSchema).min(1, "At least one item is required").optional(),
});

export type UpdateBillInput = z.infer<typeof updateBillSchema>;
