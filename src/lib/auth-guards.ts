import "server-only";
import { Role } from "@prisma/client";

import { auth } from "@/auth";

/** Sesiune garantat autentificată (după verificare). */
export interface AuthedUser {
  id: string;
  username: string;
  role: Role;
  specialtyId: string | null;
}

/** Eroare de autorizare cu status HTTP; NU expune detalii interne. */
export class AuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Întoarce utilizatorul autentificat sau aruncă AuthError(401). */
export async function requireUser(): Promise<AuthedUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError(401, "Neautentificat.");
  }
  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    specialtyId: session.user.specialtyId,
  };
}

/**
 * Cere ca utilizatorul să aibă unul dintre rolurile date. Verificarea se face
 * pe SERVER — nu ne bazăm pe UI. Aruncă AuthError(403) dacă rolul nu se potrivește.
 */
export async function requireRole(
  ...allowed: Role[]
): Promise<AuthedUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    throw new AuthError(403, "Acces interzis.");
  }
  return user;
}

/**
 * Cere rol NURSE și întoarce (garantat) specialtyId. O asistentă fără
 * specialitate asignată este un cont invalid pentru fluxul de tichete.
 */
export async function requireNurse(): Promise<
  AuthedUser & { specialtyId: string }
> {
  const user = await requireRole(Role.NURSE);
  if (!user.specialtyId) {
    throw new AuthError(403, "Cont de asistentă fără specialitate asignată.");
  }
  return { ...user, specialtyId: user.specialtyId };
}
