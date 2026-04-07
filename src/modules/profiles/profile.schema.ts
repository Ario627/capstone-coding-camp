import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(200, "Password maksimal 200 karakter")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{}|;:'",.<>?/`~])/,
    "Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial",
  );

export const getProfileSchema = z.object({}).strict();

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Nama lengkap tidak boleh kosong")
      .max(100, "Nama lengkap maksimal 100 karakter")
      .optional(),
    email: z
      .email("Format email tidak valid")
      .trim()
      .toLowerCase()
      .max(254, "Email maksimal 254 karakter")
      .optional(),
  })
  .strict()
  .refine((data) => data.fullName !== undefined || data.email !== undefined, {
    message: "Minimal satu field harus diubah (fullName atau email)",
  });

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Password lama wajib diisi"),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "Password baru tidak boleh sama dengan password lama",
  });

export type GetProfileInput = z.infer<typeof getProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;