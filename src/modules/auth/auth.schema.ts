import {z} from 'zod';

const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(200)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{}|;:'",.<>?/`~])/,
    "Harus ada huruf besar, huruf kecil, angka, dan karakter spesial",
  );

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Email tidak valid").max(254),
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(200),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;