import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient. În dev, Next.js face hot-reload frecvent; fără
 * singleton s-ar deschide conexiuni noi la fiecare reload și s-ar epuiza
 * pool-ul MySQL. Stocăm instanța pe globalThis între reload-uri.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
