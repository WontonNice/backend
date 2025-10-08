// src/db.ts
import { Pool } from "pg";
import "dotenv/config"; // slightly simpler than importing + calling config()

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your Render env vars or .env locally.");
}

export const pool = new Pool({
  connectionString,
  // Keep pool small for Supabase free tiers
  max: 5,
  idleTimeoutMillis: 30_000,
  // SSL for hosted Postgres; leave undefined locally if you run local Postgres
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
  // ^ If you always use Supabase (even locally), keeping SSL on is fine.
});

// Optional: quick connection test you can call on startup
export async function ensureDb() {
  await pool.query("SELECT 1");
}
