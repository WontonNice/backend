// src/routes/auth.ts
import { Router } from "express";
import * as bcrypt from "bcryptjs"; // works regardless of esModuleInterop
import { pool } from "../db";

const router = Router();

// Simple validators
function isValidUsername(u: unknown): u is string {
  return typeof u === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(u);
}
function isValidPassword(p: unknown): p is string {
  return typeof p === "string" && p.length >= 8 && p.length <= 128;
}

/**
 * POST /api/auth/register
 * Body: { username: string, password: string }
 * Success: 201 { user: { id, username, created_at } }
 * Errors: 400 (validation), 409 (username taken), 500 (server/db)
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username (3–32 letters/numbers/underscores)" });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Password must be 8–128 characters" });
    }

    const hash = await bcrypt.hash(password, 12);

    const insertSql = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username, created_at
    `;
    const { rows } = await pool.query(insertSql, [username, hash]);

    return res.status(201).json({ user: rows[0] });
  } catch (err: any) {
    // Unique username violation in Postgres
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    // TEMP: expose details to help you debug 500s (safe to remove later)
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      code: err?.code,
      message: err?.message,
    });
  }
});

export default router;
