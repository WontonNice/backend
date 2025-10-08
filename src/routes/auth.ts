import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";

const router = Router();

// Simple validators
function isValidUsername(u: string) {
  return typeof u === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(u);
}
function isValidPassword(p: string) {
  return typeof p === "string" && p.length >= 8 && p.length <= 128;
}

/**
 * POST /api/auth/register
 * body: { username: string, password: string }
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

    // Insert; citext makes this case-insensitive unique
    const insertSql = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username, created_at
    `;
    const { rows } = await pool.query(insertSql, [username, hash]);

    return res.status(201).json({ user: rows[0] });
  } catch (err: any) {
    // Unique violation in Postgres
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
