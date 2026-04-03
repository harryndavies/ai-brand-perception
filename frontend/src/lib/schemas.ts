import { z } from "zod/v3";

/** Login form — matches backend auth validation. */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/** Signup form — matches backend 8-128 char password, 1-100 char name. */
export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export type SignupFormData = z.infer<typeof signupSchema>;

/** Analysis form — matches backend 1-100 char brand, max 3 competitors. */
export const analysisSchema = z.object({
  brand: z.string().min(1, "Brand name is required").max(100, "Brand name is too long"),
  competitors: z.array(z.string()).max(3),
  selectedModels: z.array(z.string()).min(1, "Select at least one model"),
  repeatMonthly: z.boolean(),
});

export type AnalysisFormData = z.infer<typeof analysisSchema>;
