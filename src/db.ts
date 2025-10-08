// src/db.ts
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it in your Render env vars.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Supabase/hosted PG
  max: 5,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  connectionTimeoutMillis: 5000,      // 👈 fail fast instead of hanging
});
