// src/db.ts
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it in your Render env vars.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // required for Supabase/hosted Postgres
  max: 5,                             // keep pool small on free tiers
  idleTimeoutMillis: 30_000,
  keepAlive: true,
});
