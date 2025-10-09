// ❗ WARNING: This stores plain-text passwords. For testing only.
import { Router } from "express";
import { pool } from "../db";

const router = Router();

function isValidUsername(u: unknown): u is string {
  return typeof u === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(u);
}
function isValidPassword(p: unknown): p is string {
  return typeof p === "string" && p.length >= 1 && p.length <= 128; // allow short for quick tests
}

/**
 * POST /api/auth/register
 * Body: { username, password }
 * Success: 201 { user: { id, username, created_at } }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!isValidUsername(username)) return res.status(400).json({ error: "Invalid username" });
    if (!isValidPassword(password)) return res.status(400).json({ error: "Invalid password" });

    // Store password AS-IS (in password_hash column) — not secure; testing only.
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
      [username, password]
    );

    return res.status(201).json({ user: rows[0] });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Username already taken" });
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ error: "Server error", code: err?.code, message: err?.message });
  }
});

export default router;
