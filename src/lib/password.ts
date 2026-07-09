import "server-only";
import argon2 from "argon2";

/**
 * Hashing de parole cu argon2id.
 * Parametrii urmează recomandările OWASP (memoryCost ~19 MiB, timeCost 2).
 * Aceiași parametri sunt folosiți și în prisma/seed.ts.
 */
const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTIONS);
}

/**
 * Verifică o parolă în timp constant (argon2.verify) pentru a evita
 * scurgeri prin timing. Orice eroare de format => false (nu aruncă).
 */
export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
