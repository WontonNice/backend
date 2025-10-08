// src/db.ts
import { Pool } from "pg";
import dns from "dns";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it in your Render env vars.");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  // 👇 Force IPv4 so we don’t try IPv6 (avoids ENETUNREACH)
  lookup: (hostname, _opts, cb) => dns.lookup(hostname, { family: 4, all: false }, cb),
});
