import { z } from "zod";

// Preț: număr finit, >= 0, cel mult 2 zecimale, plafon rezonabil.
// z.coerce acceptă și string-uri din inputurile HTML.
const priceSchema = z.coerce
  .number({ invalid_type_error: "Preț invalid" })
  .refine((n) => Number.isFinite(n), "Preț invalid")
  .refine((n) => n >= 0, "Prețul nu poate fi negativ")
  .refine((n) => n <= 9_999_999.99, "Preț prea mare")
  .refine((n) => Math.round(n * 100) === n * 100, "Cel mult 2 zecimale");

// Id opțional din <select>: string gol / null / undefined => null.
const optionalId = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().max(64).nullable(),
);

/** O linie de procedură din formular. */
export const ticketItemSchema = z
  .object({
    procedureId: optionalId,
    name: z.string().trim().min(1, "Numele procedurii e obligatoriu").max(160),
    price: priceSchema,
    isCustom: z.boolean(),
  })
  .superRefine((item, ctx) => {
    if (item.isCustom) {
      if (item.procedureId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["procedureId"],
          message: "O procedură custom nu poate avea procedureId.",
        });
      }
    } else if (!item.procedureId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["procedureId"],
        message: "Selectați o procedură din listă.",
      });
    }
  });

/** Payload-ul complet pentru crearea unui tichet. */
export const createTicketSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, "Introduceți numele pacientului")
    .max(120, "Nume prea lung"),
  doctorId: optionalId,
  observations: z.preprocess(
    (v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null),
    z.string().max(2000, "Observații prea lungi").nullable(),
  ),
  // Pacient asigurat CAS (nu plătește nimic).
  isInsuredCAS: z.boolean().default(false),
  items: z
    .array(ticketItemSchema)
    .min(1, "Adăugați cel puțin o procedură")
    .max(30, "Prea multe proceduri pe un tichet"),
});

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type CreateTicketData = z.output<typeof createTicketSchema>;
