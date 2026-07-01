import { PrismaClient } from "@prisma/client";

// Prisma Client connection singleton.
//
// In development Next.js hot-reloads modules, which would otherwise create a
// new PrismaClient (and a new connection pool) on every reload and exhaust the
// database's connection limit. Caching the instance on globalThis keeps a
// single client across reloads. In production a fresh client per process is
// fine, so we don't attach it to globalThis there.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
