// src/db.ts
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it in your Render env vars.");
}

export const pool = new Pool({
  connectionString,
  // Supabase/hosted Postgres typically require SSL
  ssl: { rejectUnauthorized: false },
  // keep connections low on free tiers
  max: 5,
  idleTimeoutMillis: 30_000,
});
