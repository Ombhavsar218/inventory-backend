import { z } from "zod";

export const stockSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity must be 0 or more"),
  unit: z.string().min(1, "Unit is required"),
  price: z.number().min(0, "Price must be 0 or more"),
  mrp: z.number().min(0).optional(),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  minStock: z.number().int().min(0, "Min stock must be 0 or more").optional(),
  description: z.string().optional(),
});

export type StockInput = z.infer<typeof stockSchema>;
