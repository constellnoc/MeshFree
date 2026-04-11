import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

declare global {
  // Reuse the client in development to avoid creating duplicates during reloads.
  var prismaAdapter: PrismaBetterSqlite3 | undefined;
  var prisma: PrismaClient | undefined;
}

const adapter =
  globalThis.prismaAdapter ?? new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaAdapter = adapter;
  globalThis.prisma = prisma;
}

export default prisma;
