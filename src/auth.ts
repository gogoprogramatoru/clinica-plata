import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";

// Hash argon2id "momeală" folosit când username-ul nu există, pentru a
// egaliza timpul de răspuns și a nu dezvălui existența contului prin timing.
// (Hash valid pentru parola "invalid-decoy-password".)
const DECOY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZS1zdGF0aWMtc2FsdA$3s5b3wJt9m0h6b2mD4Zr2sVw0kqA1mP5oXf7gY9nT2c";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // Un login eșuat (parolă greșită) este normal și e deja tratat elegant în
    // loginAction. Nu poluăm terminalul cu stack trace pentru acest caz;
    // logăm în continuare orice altă eroare reală.
    error(error) {
      if (error?.name === "CredentialsSignin") return;
      // eslint-disable-next-line no-console
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Utilizator", type: "text" },
        password: { label: "Parolă", type: "password" },
      },
      /**
       * Validează credențialele. Returnează `null` pentru orice eșec, fără a
       * distinge între "username inexistent" și "parolă greșită".
       */
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.active) {
          // Rulăm o verificare "momeală" pentru a menține timpul constant.
          await verifyPassword(DECOY_HASH, password);
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          specialtyId: user.specialtyId,
        };
      },
    }),
  ],
});
