import "server-only";
import { ZodError } from "zod";

import { AuthError } from "@/lib/auth-guards";

/** Rezultat tipat, uniform, pentru server actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Convertește excepții în răspunsuri sigure pentru client. NU expune niciodată
 * stack trace-uri sau detalii interne. Erorile neașteptate sunt logate pe server.
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) {
    return fail(error.message);
  }
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return fail("Date invalide.", fieldErrors);
  }
  // eslint-disable-next-line no-console
  console.error("[action] eroare neașteptată:", error);
  return fail("A apărut o eroare. Reîncercați.");
}
