import { z } from "zod";

/** Schema pentru credențialele de login. Validată identic pe client și server. */
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Introduceți numele de utilizator")
    .max(64, "Nume de utilizator prea lung"),
  password: z
    .string()
    .min(1, "Introduceți parola")
    .max(200, "Parolă prea lungă"),
});

export type LoginInput = z.infer<typeof loginSchema>;
