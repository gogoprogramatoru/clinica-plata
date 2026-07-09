import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatenează clase Tailwind, rezolvând conflictele (util pentru variante). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formatează o sumă numerică în format monetar RON (ex. "250,00 lei"). */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  }).format(value);
}

/** Formatează o dată/oră pentru afișare (ex. "08.07.2026, 14:32"). */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
