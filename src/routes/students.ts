import express from 'express';
import { pool } from '../db';

const router = express.Router();

/* ===========================
   POINTS (Option A)
   =========================== */

/** GET /api/students/points?teacherId=123 */
router.get('/points', async (req, res) => {
  try {
    const teacherId = Number(req.query.teacherId);
    if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

    const { rows } = await pool.query(
      `SELECT name, points
       FROM students
       WHERE teacher_id = $1
       ORDER BY name ASC`,
      [teacherId]
    );

    res.json(rows); // [{ name, points }]
  } catch (err) {
    console.error('GET /students/points error:', err);
    res.status(500).json({ error: 'failed to fetch points' });
  }
});

/** POST /api/students/points/bulk
 *  { teacherId, updates: [{ name, points }] }
 */
router.post('/points/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { teacherId, updates } = req.body || {};
    if (!teacherId || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'teacherId and updates[] required' });
    }

    await client.query('BEGIN');

    for (const { name, points } of updates) {
      const safePoints = Math.max(0, Number(points) || 0);
      await client.query(
        `UPDATE students
         SET points = $1
         WHERE teacher_id = $2 AND name = $3`,
        [safePoints, Number(teacherId), name]
      );
      // If you want to create missing students automatically, switch to an UPSERT:
      // await client.query(
      //   `INSERT INTO students (name, teacher_id, points)
      //    VALUES ($1, $2, $3)
      //    ON CONFLICT (name, teacher_id) DO UPDATE
      //    SET points = EXCLUDED.points`,
      //   [name, Number(teacherId), safePoints]
      // );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /students/points/bulk error:', err);
    res.status(500).json({ error: 'failed to save points' });
  } finally {
    client.release();
  }
});

/* ===========================
   EXISTING ACTIVITY ROUTES
   =========================== */

// Get all weekly activities for a specific student (by numeric student id)
router.get('/:id/activities', async (req, res) => {
  const studentId = parseInt(req.params.id, 10);

  try {
    const result = await pool.query(
      `SELECT day_of_week, activity_id, a.name AS activity_name 
       FROM student_activities sa
       JOIN activities a ON sa.activity_id = a.id
       WHERE student_id = $1`,
      [studentId]
    );

    const activities: Record<string, { id: number; name: string }> = {};
    result.rows.forEach((row) => {
      activities[row.day_of_week] = {
        id: row.activity_id,
        name: row.activity_name,
      };
    });

    res.json(activities);
  } catch (err) {
    console.error('Error fetching student activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Update weekly activities for a student (by numeric student id)
router.post('/:id/activities', async (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const updates = req.body as Record<string, number | null>; // { Mon: 3, Tue: null, ... }

  try {
    for (const [day, activityId] of Object.entries(updates)) {
      const existing = await pool.query(
        'SELECT id FROM student_activities WHERE student_id = $1 AND day_of_week = $2',
        [studentId, day]
      );

      if (activityId === null) {
        if (existing.rows.length > 0) {
          await pool.query(
            'DELETE FROM student_activities WHERE student_id = $1 AND day_of_week = $2',
            [studentId, day]
          );
        }
      } else {
        if (existing.rows.length > 0) {
          await pool.query(
            'UPDATE student_activities SET activity_id = $1 WHERE student_id = $2 AND day_of_week = $3',
            [activityId, studentId, day]
          );
        } else {
          await pool.query(
            'INSERT INTO student_activities (student_id, activity_id, day_of_week) VALUES ($1, $2, $3)',
            [studentId, activityId, day]
          );
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error updating student activities:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all students and their activities for a given day (Task view)
router.get('/activities/by-day', async (req, res) => {
  const day = req.query.day as string;

  if (!day) {
    return res.status(400).json({ error: 'Missing day query param' });
  }

  try {
    const result = await pool.query(
      `SELECT s.id AS student_id, s.name AS student_name, a.name AS activity_name
       FROM student_activities sa
       JOIN students s ON sa.student_id = s.id
       JOIN activities a ON sa.activity_id = a.id
       WHERE sa.day_of_week = $1`,
      [day]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities by day:', err);
    res.status(500).json({ error: 'Failed to fetch day activities' });
  }
});

export default router;
