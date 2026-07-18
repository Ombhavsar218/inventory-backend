import { z } from "zod";

export const shopSchema = z.object({
  name: z.string().min(1, "Shop name is required"),
  address: z.string().min(1, "Address is required"),
  gstNo: z.string().optional(),
  fssaiNo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  stateCode: z.string().optional(),
});

export type ShopInput = z.infer<typeof shopSchema>;
