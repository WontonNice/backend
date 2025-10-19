// backend/src/routes/examLocks.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

// Reuse the same pattern you use in routes/auth.ts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// (Optional) simple role guard – adapt to your auth story if you have one
async function requireTeacher(req: any, res: any, next: any) {
  // If you're sending a user id, look it up and check role === 'teacher'
  // Example only — change this to your real auth (JWT / session / profiles)
  const role = (req.headers["x-user-role"] as string) || "";
  if (role.toLowerCase() !== "teacher") {
    return res.status(403).json({ error: "Teacher role required" });
  }
  next();
}

/**
 * GET /api/exams/:slug/lock
 * -> { locked: boolean }
 */
router.get("/:slug/lock", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const { data, error } = await supabase
      .from("exam_locks")
      .select("locked")
      .eq("exam_slug", slug)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ locked: data?.locked ?? false });
  } catch (e: any) {
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /api/exams/:slug/lock
 * Body: { locked: boolean }
 * -> { locked: boolean }
 */
router.put("/:slug/lock", requireTeacher, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const nextLocked = !!req.body?.locked;

    const { error } = await supabase
      .from("exam_locks")
      .upsert({ exam_slug: slug, locked: nextLocked }, { onConflict: "exam_slug" });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ locked: nextLocked });
  } catch (e: any) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
