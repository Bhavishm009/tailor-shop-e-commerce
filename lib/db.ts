import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

const adapter = new PrismaPg(pool)

function createClient() {
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

let prisma = globalForPrisma.prisma ?? createClient()

// During development, hot-reload can keep an old Prisma client instance alive.
// Recreate it when newer delegates (e.g. `productMaster`) are missing.
if (typeof (prisma as any).productMaster === "undefined") {
  prisma = createClient()
}

export const db = prisma

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool
  globalForPrisma.prisma = db
}
