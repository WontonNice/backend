import express from 'express';
import {
  getStudentsByTeacher,
  markAttendance,
  getAttendanceByTeacher,
  getStudentsWithAttendanceByDate
} from '../models/students';
import { pool } from '../db';

const router = express.Router();

// Fetch students for a specific teacher
router.get('/students', async (req, res) => {
  const teacherId = Number(req.query.teacherId);
  const date = req.query.date as string;

  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId' });
  }

  try {
    let students;
    if (date) {
      students = await getStudentsWithAttendanceByDate(teacherId, date);
    } else {
      students = await getStudentsByTeacher(teacherId);
    }

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit attendance for a specific teacher’s student
router.post('/attendance', async (req, res) => {
  const { teacherId, studentName, status, date } = req.body;
  if (!teacherId || !studentName || !['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  await markAttendance(teacherId, studentName, status, date);
  res.json({ success: true });
});

// Get all attendance for a teacher
router.get('/attendance', async (req, res) => {
  const teacherId = Number(req.query.teacherId);
  if (!teacherId) return res.status(400).json({ error: 'Missing teacherId' });

  const records = await getAttendanceByTeacher(teacherId);
  res.json(records);
});
// Add student to class
router.post('/students/create', async (req, res) => {
  const { name, teacherId } = req.body;
  if (!name || !teacherId) {
    return res.status(400).json({ error: 'Missing name or teacherId' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO students (name, teacher_id) VALUES ($1, $2) RETURNING *',
      [name, teacherId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting student:', err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});
// Delete a student from a teacher's class
router.delete('/students/delete', async (req, res) => {
  const { name, teacherId } = req.body;

  if (!name || !teacherId) {
    return res.status(400).json({ error: 'Missing name or teacherId' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM students WHERE name = $1 AND teacher_id = $2 RETURNING *',
      [name, teacherId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Get current lock status
router.get('/lock-status', async (_req, res) => {
  try {
    const result = await pool.query('SELECT locked FROM attendance_lock WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Lock status not initialized' });
    }
    res.json({ locked: result.rows[0].locked });
  } catch (err) {
    console.error('Error fetching lock status:', err);
    res.status(500).json({ error: 'Failed to fetch lock status' });
  }
});

// Update lock status (admin only)
router.put('/lock-status', async (req, res) => {
  const { locked } = req.body;

  if (typeof locked !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid locked value' });
  }

  try {
    const result = await pool.query(
      'UPDATE attendance_lock SET locked = $1 WHERE id = 1 RETURNING locked',
      [locked]
    );
    if (result.rowCount === 0) {
      return res.status(500).json({ error: 'Lock status not initialized' });
    }
    res.json({ success: true, locked: result.rows[0].locked });
  } catch (err) {
    console.error('Error updating lock status:', err);
    res.status(500).json({ error: 'Failed to update lock status' });
  }
});

// Get weekly activities for students of a teacher
router.get('/students/activities', async (req, res) => {
  const teacherId = Number(req.query.teacherId);
  if (!teacherId) return res.status(400).json({ error: 'Missing teacherId' });

  try {
    const result = await pool.query(
      `SELECT students.name, activities.day_of_week, activities.activity
       FROM students
       LEFT JOIN activities ON students.id = activities.student_id
       WHERE students.teacher_id = $1`,
      [teacherId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Save/update activities for a student
router.post('/students/:name/activities', async (req, res) => {
  const studentName = req.params.name;
  const activityMap = req.body; // { Mon: "Basketball", Tue: "...", ... }

  try {
    const studentResult = await pool.query(
      'SELECT id FROM students WHERE name = $1',
      [studentName]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentId = studentResult.rows[0].id;

    // Delete old entries
    await pool.query('DELETE FROM activities WHERE student_id = $1', [studentId]);

    // Insert new ones
const entries = Object.entries(activityMap);
for (const [day, activity] of entries) {
  if (typeof activity !== 'string' || !activity.trim()) continue;

      await pool.query(
        'INSERT INTO activities (student_id, day_of_week, activity) VALUES ($1, $2, $3)',
        [studentId, day, activity]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating activities:', err);
    res.status(500).json({ error: 'Failed to update activities' });
  }
});


export default router;
