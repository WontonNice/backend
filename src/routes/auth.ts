import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username || "")) {
    return res.status(400).json({ error: "Invalid username" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be ≥ 8 chars" });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const sql = `INSERT INTO users (username, password_hash)
                 VALUES ($1, $2)
                 RETURNING id, username, created_at`;
    const { rows } = await pool.query(sql, [username, hash]);
    return res.status(201).json({ user: rows[0] });
} catch (err: any) {
  if (err?.code === "23505") {
    return res.status(409).json({ error: "Username already taken" });
  }
  console.error("REGISTER_ERROR:", err);
  return res.status(500).json({
    error: "Server error",
    code: err?.code,
    message: err?.message
  });
}
});

export default router;
