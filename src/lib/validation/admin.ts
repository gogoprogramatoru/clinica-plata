import { z } from "zod";
import { Role } from "@prisma/client";

const cuid = z.string().min(1).max(64);
const name = z.string().trim().min(2, "Prea scurt").max(120, "Prea lung");

const price = z.coerce
  .number({ invalid_type_error: "Preț invalid" })
  .refine((n) => Number.isFinite(n) && n >= 0, "Preț invalid")
  .refine((n) => n <= 9_999_999.99, "Preț prea mare")
  .refine((n) => Math.round(n * 100) === n * 100, "Cel mult 2 zecimale");

// --- Specialități ---
export const createSpecialtySchema = z.object({ name });
export const updateSpecialtySchema = z.object({
  id: cuid,
  name: name.optional(),
  active: z.boolean().optional(),
});

// --- Medici ---
export const createDoctorSchema = z.object({
  name,
  specialtyId: cuid,
});
export const updateDoctorSchema = z.object({
  id: cuid,
  name: name.optional(),
  specialtyId: cuid.optional(),
  active: z.boolean().optional(),
});

// --- Proceduri ---
export const createProcedureSchema = z.object({
  name,
  defaultPrice: price,
  specialtyId: cuid,
});
export const updateProcedureSchema = z.object({
  id: cuid,
  name: name.optional(),
  defaultPrice: price.optional(),
  specialtyId: cuid.optional(),
  active: z.boolean().optional(),
});

// --- Utilizatori ---
// Parola: minim 10 caractere, cu litere și cifre. Fără plafon absurd.
const password = z
  .string()
  .min(10, "Parola trebuie să aibă minim 10 caractere")
  .max(200, "Parolă prea lungă")
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), {
    message: "Parola trebuie să conțină litere și cifre",
  });

const username = z
  .string()
  .trim()
  .min(3, "Minim 3 caractere")
  .max(64, "Prea lung")
  .regex(/^[a-zA-Z0-9._-]+$/, "Doar litere, cifre, . _ -");

export const createUserSchema = z
  .object({
    username,
    password,
    // Adminul creează doar conturi de Recepție și Asistentă.
    role: z.enum([Role.RECEPTION, Role.NURSE]),
    specialtyId: cuid.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === Role.NURSE && !data.specialtyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialtyId"],
        message: "O asistentă trebuie legată de o specialitate.",
      });
    }
    if (data.role === Role.RECEPTION && data.specialtyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialtyId"],
        message: "Recepția nu se leagă de o specialitate.",
      });
    }
  });

export const updateUserSchema = z.object({
  id: cuid,
  active: z.boolean().optional(),
  specialtyId: cuid.nullable().optional(),
});

export const resetPasswordSchema = z.object({
  id: cuid,
  password,
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateSpecialtyInput = z.input<typeof createSpecialtySchema>;
export type CreateDoctorInput = z.input<typeof createDoctorSchema>;
export type CreateProcedureInput = z.input<typeof createProcedureSchema>;
