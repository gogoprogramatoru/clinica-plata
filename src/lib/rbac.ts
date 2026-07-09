// IMPORTANT: import DOAR de tip. Acest modul e folosit de middleware (Edge
// Runtime); un import de valoare din @prisma/client ar trage clientul Prisma
// în bundle-ul edge (nesuportat + inutil). Folosim string-uri pentru valori.
import type { Role } from "@prisma/client";

/**
 * Definiție centralizată a accesului pe rute în funcție de rol. Folosită de
 * middleware pentru gating (redirect) și pentru redirecturi post-login.
 */
export const ROLE_HOME: Record<Role, string> = {
  NURSE: "/nurse",
  RECEPTION: "/reception",
  ADMIN: "/admin",
};

/** Prefix de rută -> roluri care au voie. Prima potrivire câștigă. */
const ROUTE_ACCESS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/nurse", roles: ["NURSE"] as Role[] },
  { prefix: "/reception", roles: ["RECEPTION"] as Role[] },
  { prefix: "/admin", roles: ["ADMIN"] as Role[] },
];

/** Rutele protejate care necesită autentificare (orice rol valid). */
export function isProtectedPath(pathname: string): boolean {
  return ROUTE_ACCESS.some((r) => pathname.startsWith(r.prefix));
}

/** Verifică dacă un rol are acces la o cale dată. */
export function canAccess(pathname: string, role: Role | undefined): boolean {
  if (!role) return false;
  const match = ROUTE_ACCESS.find((r) => pathname.startsWith(r.prefix));
  // Căile care nu sunt în harta de acces nu sunt gestionate aici.
  if (!match) return true;
  return match.roles.includes(role);
}
