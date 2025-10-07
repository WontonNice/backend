import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Simple login with name + plain text password
router.post('/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ error: 'Missing name or password' });
  }

  const result = await pool.query(
    'SELECT id, role, password FROM teachers WHERE name = $1',
    [name]
  );
  const teacher = result.rows[0];

  if (!teacher || teacher.password !== password) {
    return res.status(401).json({ error: 'Invalid name or password' });
  }

  // Return teacher ID and role (admin or teacher)
  res.json({ id: teacher.id, role: teacher.role });
});

router.get('/teachers', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, class_display_name FROM teachers WHERE role = $1', ['teacher']);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});
// Add new teacher
router.post('/create', async (req, res) => {
  const { name, password, role } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Missing fields' });

  const result = await pool.query(
    `INSERT INTO teachers (name, password, role) VALUES ($1, $2, $3) RETURNING *`,
    [name, password, role || 'teacher']
  );
  res.json(result.rows[0]);
});
router.get('/debug-teachers', async (_req, res) => {
  const result = await pool.query('SELECT * FROM teachers');
  res.json(result.rows);
});
// Delete a class (teacher + students)
router.delete('/delete', async (req, res) => {
  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all students under this teacher
    await client.query('DELETE FROM students WHERE teacher_id = $1', [teacherId]);

    // Delete the teacher
    const result = await client.query('DELETE FROM teachers WHERE id = $1 RETURNING *', [teacherId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting class:', err);
    res.status(500).json({ error: 'Failed to delete class' });
  } finally {
    client.release();
  }
});
// Update admin (or teacher) password
router.put('/update-password', async (req, res) => {
  const { teacherId, newPassword } = req.body;

  if (!teacherId || !newPassword) {
    return res.status(400).json({ error: 'Missing teacherId or newPassword' });
  }

  try {
    const result = await pool.query(
      'UPDATE teachers SET password = $1 WHERE id = $2 RETURNING id',
      [newPassword, teacherId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.put('/update-name', async (req, res) => {
  const { teacherId, newName } = req.body;

  if (!teacherId || !newName) {
    return res.status(400).json({ error: 'Missing teacherId or newName' });
  }

  try {
    const result = await pool.query(
      'UPDATE teachers SET class_display_name = $1 WHERE id = $2 RETURNING id, class_display_name',
      [newName, teacherId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ success: true, updated: result.rows[0] });
  } catch (err) {
    console.error('Error updating class name:', err);
    res.status(500).json({ error: 'Failed to update class name' });
  }
});

// Get teacher name mapping (id => class_display_name)
router.get('/name-map', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, class_display_name FROM teachers WHERE role = $1',
      ['teacher']
    );
    const mapping: Record<string, string> = {};
    result.rows.forEach((row) => {
      mapping[row.id] = row.class_display_name || '';
    });
    res.json(mapping);
  } catch (err) {
    console.error('Error fetching name map:', err);
    res.status(500).json({ error: 'Failed to fetch teacher names' });
  }
});

export default router;
