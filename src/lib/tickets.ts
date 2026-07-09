import type { Prisma } from "@prisma/client";

/**
 * Calculează totalul unui tichet ca sumă a prețurilor liniilor.
 *
 * Suma se face în bani întregi (cenți/bani) pentru a evita erorile de
 * virgulă mobilă (ex. 0.1 + 0.2). Funcție pură — ușor de testat.
 */
export function calculateTicketTotal(items: Array<{ price: number }>): number {
  const totalCents = items.reduce((acc, item) => {
    return acc + Math.round(item.price * 100);
  }, 0);
  return totalCents / 100;
}

/** Convertește un Prisma.Decimal (sau string) într-un number sigur pentru UI. */
export function decimalToNumber(value: Prisma.Decimal | string | number): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}
