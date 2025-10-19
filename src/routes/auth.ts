// src/auth.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---- validators ----
function isValidUsername(u: unknown): u is string {
  return typeof u === "string" && /^[a-zA-Z0-9_]{3,32}$/.test(u);
}
function isValidPassword(p: unknown): p is string {
  return typeof p === "string" && p.length >= 1 && p.length <= 128;
}
function normalizeName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.trim();
  if (!s) return null;
  // allow letters, spaces, hyphens, apostrophes; 1–64 chars
  if (!/^[A-Za-z][A-Za-z' -]{0,63}$/.test(s)) return null;
  return s;
}

/**
 * POST /api/auth/register
 * Body: { username, password, firstName?, lastName? } (snake_case also accepted)
 * Always creates a student account.
 */
router.post("/register", async (req, res) => {
  try {
    // accept both camelCase and snake_case
    let {
      username,
      password,
      firstName,
      lastName,
      first_name,
      last_name,
    } = req.body ?? {};

    if (typeof username === "string") username = username.trim();
    if (typeof password === "string") password = password.trim();

    const fname = normalizeName(firstName ?? first_name);
    const lname = normalizeName(lastName ?? last_name);

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username" });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // Build insert payload; only add name fields if provided/valid
    const toInsert: Record<string, unknown> = {
      username,
      password_hash: password, // plaintext by request
      role: "student",
      // streak metrics start at defaults (DB defaults recommended)
      // last_login_at, streak_count, best_streak set on first login
    };
    if (fname) toInsert.first_name = fname;
    if (lname) toInsert.last_name = lname;

    const { data, error } = await supabase
      .from("users")
      .insert([toInsert])
      .select(
        "id, username, role, first_name, last_name, created_at, last_login_at, streak_count, best_streak, achievements_count"
      )
      .single();

    if (error) {
      console.error("REGISTER_ERROR:", { code: error?.code, message: error?.message });
      // Map common DB errors so the frontend sees a helpful message
      const code = String(error?.code || "");
      const msg  = String(error?.message || "");
      if (code === "23505" || /duplicate key|already exists/i.test(msg)) {
        return res.status(409).json({ error: "Username already taken" });
      }
      if (code === "42P01" || /relation .* does not exist/i.test(msg)) {
        return res.status(500).json({ error: "Table public.users does not exist" });
      }
      if (code === "42703" || /column .* does not exist/i.test(msg)) {
        return res.status(500).json({
          error:
            "A referenced column does not exist (check that streak/achievement columns were added)",
        });
      }
      if (code === "23502" || /null value in column .* violates not-null constraint/i.test(msg)) {
        return res.status(400).json({ error: "Missing a required field (null in NOT NULL column)" });
      }
      return res.status(500).json({ error: "Database error" });
    }

    // Safety: coalesce role to 'student' in the response
    const user = {
      ...data,
      role: (data?.role === "teacher" ? "teacher" : "student") as "teacher" | "student",
    };
    return res.status(201).json({ user });
  } catch (err: any) {
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * Streak rules:
 * - first login -> 1
 * - if last_login_at is 24–48h ago -> increment by 1
 * - if >= 48h -> reset to 1
 * - if < 24h -> unchanged
 */
router.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body ?? {};
    if (typeof username === "string") username = username.trim();
    if (typeof password === "string") password = password.trim();

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Fetch current user including streak fields
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, username, password_hash, role, first_name, last_name, created_at, last_login_at, streak_count, best_streak, achievements_count"
      )
      .eq("username", username)
      .single();

    if (error || !data) {
      // handle “missing column” specifically to help migrations
      const code = String(error?.code || "");
      const msg = String(error?.message || "");
      if (code === "42703" || /column .* does not exist/i.test(msg)) {
        return res
          .status(500)
          .json({ error: "Streak columns missing. Run the migration to add last_login_at, streak_count, best_streak, achievements_count." });
      }
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (data.password_hash !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // --- Streak logic ---
    const now = new Date();
    const last = data.last_login_at ? new Date(data.last_login_at) : null;
    const prev = Number.isFinite(data.streak_count) ? (data.streak_count as number) : 0;

    let newStreak = prev;
    if (!last) {
      newStreak = 1; // first ever login
    } else {
      const diffHours = (now.getTime() - last.getTime()) / 36e5; // ms -> hours
      if (diffHours >= 48) newStreak = 1;           // missed a day -> reset
      else if (diffHours >= 24) newStreak = prev + 1; // within 24–48h window -> +1
      else newStreak = prev;                         // logged <24h ago -> no change
    }

    const newBest = Math.max(newStreak, data.best_streak ?? 0);

    // Update + read back the fresh row (omit password_hash in select)
    const { data: updated, error: uerr } = await supabase
      .from("users")
      .update({
        last_login_at: now.toISOString(),
        streak_count: newStreak,
        best_streak: newBest,
      })
      .eq("id", data.id)
      .select(
        "id, username, role, first_name, last_name, created_at, last_login_at, streak_count, best_streak, achievements_count"
      )
      .single();

    if (uerr || !updated) {
      console.error("STREAK_UPDATE_ERROR:", uerr);
      return res.status(500).json({ error: "Database error" });
    }

    // Simple level: 1 level per 7-day streak
    const level = 1 + Math.floor((updated.streak_count ?? 0) / 7);

    // Ensure role is always 'teacher' or 'student'
    const safeRole = (updated.role === "teacher" ? "teacher" : "student") as "teacher" | "student";

    const user = {
      ...updated,
      role: safeRole,
      level, // ephemeral; compute client-side too if desired
    };

    return res.status(200).json({ user });
  } catch (err: any) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
