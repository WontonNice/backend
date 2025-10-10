// src/auth.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isValidUsername(u: unknown): u is string {
  return typeof u === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(u);
}
function isValidPassword(p: unknown): p is string {
  return typeof p === "string" && p.length >= 1 && p.length <= 128;
}

/**
 * POST /api/auth/register
 * Body: { username, password }
 * Always creates a student account.
 */
router.post("/register", async (req, res) => {
  try {
    let { username, password } = req.body ?? {};
    if (typeof username === "string") username = username.trim();
    if (typeof password === "string") password = password.trim();

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{ username, password_hash: password, role: "student" }])
      .select("id, username, role, created_at")
      .single();

    if (error) {
      // Handle unique constraint in a few common shapes
      const msg = String(error.message || "");
      if (error.code === "23505" || msg.includes("duplicate key") || msg.includes("already exists")) {
        return res.status(409).json({ error: "Username already taken" });
      }
      console.error("REGISTER_ERROR:", error);
      return res.status(500).json({ error: "Database error" });
    }

    // Safety: coalesce role to 'student' in the response
    const user = { ...data, role: (data?.role === "teacher" ? "teacher" : "student") as "teacher" | "student" };
    return res.status(201).json({ user });
  } catch (err: any) {
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body ?? {};
    if (typeof username === "string") username = username.trim();
    if (typeof password === "string") password = password.trim();

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, username, password_hash, role, created_at")
      .eq("username", username)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (data.password_hash !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Ensure role is always present and exactly 'teacher' or 'student'
    const safeRole = (data.role === "teacher" ? "teacher" : "student") as "teacher" | "student";
    const { password_hash, ...rest } = data;
    const user = { ...rest, role: safeRole };

    // Debug (optional): verify role coming back as expected
    // console.log("LOGIN_USER", user);

    return res.status(200).json({ user });
  } catch (err: any) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
