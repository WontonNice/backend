// src/auth.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service key required for inserts
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
 * Success: 201 { user: { id, username, created_at } }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!isValidUsername(username))
      return res.status(400).json({ error: "Invalid username" });
    if (!isValidPassword(password))
      return res.status(400).json({ error: "Invalid password" });

    // Insert directly into 'users' table (plain-text password for testing)
    const { data, error } = await supabase
      .from("users")
      .insert([{ username, password_hash: password }])
      .select("id, username, created_at")
      .single();

    if (error) {
      if (error.message.includes("duplicate key"))
        return res.status(409).json({ error: "Username already taken" });
      console.error("REGISTER_ERROR:", error);
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(201).json({ user: data });
  } catch (err: any) {
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
