import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Extindem tipurile NextAuth pentru a transporta rolul, specialitatea și
 * username-ul prin JWT și sesiune. Aceste câmpuri sunt populate în callback-uri.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      specialtyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    username: string;
    role: Role;
    specialtyId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    specialtyId: string | null;
  }
}
