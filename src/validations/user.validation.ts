import { z } from "zod/v4";

export const createUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.email("Please provide a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["SUPERADMIN", "OWNER", "MARKETING", "API"]),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").optional(),
  email: z.email("Please provide a valid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  role: z.enum(["SUPERADMIN", "OWNER", "MARKETING", "API"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
