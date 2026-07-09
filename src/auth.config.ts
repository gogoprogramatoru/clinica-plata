import type { NextAuthConfig } from "next-auth";

/**
 * Config NextAuth "edge-safe": conține DOAR ce poate rula în middleware (edge
 * runtime) — fără Prisma, fără argon2. Providerul Credentials (care are nevoie
 * de Node) este adăugat separat în `auth.ts`.
 *
 * Callback-urile jwt/session doar mută câmpuri pe obiecte, deci sunt sigure
 * în ambele runtime-uri.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 ore
  },
  // Providerii sunt injectați în auth.ts; middleware-ul nu are nevoie de ei
  // pentru a citi/valida JWT-ul.
  providers: [],
  callbacks: {
    /** La login copiem datele utilizatorului în token; apoi le persistăm. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? "";
        token.username = user.username;
        token.role = user.role;
        token.specialtyId = user.specialtyId;
      }
      return token;
    },
    /** Expunem câmpurile din token în obiectul de sesiune. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.specialtyId = token.specialtyId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
