/**
 * Database client (Drizzle + postgres.js).
 *
 * The postgres.js client is cached on globalThis so Next.js hot-reloads in dev
 * (and reused function instances on Vercel Fluid Compute) don't open a new pool
 * on every change. `prepare: false` is required when talking to a connection
 * pooler in transaction mode, which is how Neon's pooled connection string works.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

const client = globalForDb.client ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
