import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient;

function buildPoolConfig(connectionString: string): PoolConfig {
  const config: PoolConfig = { connectionString };

  try {
    const parsed = new URL(connectionString);
    const sslmode = parsed.searchParams.get("sslmode") || "prefer";

    if (sslmode === "require" || sslmode === "prefer" || sslmode === "allow" || sslmode === "verify-ca") {
      // node-postgres >=8.11 treats `require`/`prefer`/`verify-ca` as aliases for
      // verify-full, which fails against managed cloud hosts (e.g. Neon poolers).
      // Restore the classic "require" behavior (encrypt, skip cert pinning).
      config.ssl = { rejectUnauthorized: false };
    } else if (sslmode === "verify-full") {
      config.ssl = { rejectUnauthorized: true };
    } else if (sslmode === "disable") {
      config.ssl = false;
    }
  } catch {
    // Not a parsable URL — let pg handle it.
  }

  return config;
}

if (process.env.DATABASE_URL) {
  const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));
  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });
} else {
  throw new Error("DATABASE_URL environment variable is required");
}

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;