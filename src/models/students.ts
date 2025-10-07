import { pool } from '../db';

export async function getStudentsByTeacher(teacherId: number) {
  const res = await pool.query(
    'SELECT * FROM students WHERE teacher_id = $1 ORDER BY name',
    [teacherId]
  );
  return res.rows;
}

export async function markAttendance(
  teacherId: number,
  studentName: string,
  status: 'Present' | 'Absent',
  date?: string
) {
  // Get or create student under the current teacher
  let student = await pool.query(
    'SELECT * FROM students WHERE name = $1 AND teacher_id = $2',
    [studentName, teacherId]
  );

  if (student.rows.length === 0) {
    student = await pool.query(
      'INSERT INTO students (name, teacher_id) VALUES ($1, $2) RETURNING *',
      [studentName, teacherId]
    );
  }

  const studentId = student.rows[0].id;
  const attendanceDate = date ?? new Date().toISOString().split('T')[0];

  await pool.query(
    `
    INSERT INTO attendance (student_id, date, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (student_id, date)
    DO UPDATE SET status = EXCLUDED.status
    `,
    [studentId, attendanceDate, status]
  );
}

export async function getAttendanceByTeacher(teacherId: number) {
  const res = await pool.query(
    `
    SELECT s.name, a.date, a.status
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE s.teacher_id = $1
    ORDER BY s.name, a.date
    `,
    [teacherId]
  );

  const formatted: Record<string, Record<string, 'Present' | 'Absent'>> = {};
  for (const row of res.rows) {
    const { name, date, status } = row;
    if (!formatted[name]) formatted[name] = {};
    formatted[name][date] = status;
  }

  return formatted;
}

export async function getStudentsWithAttendanceByDate(teacherId: number, date: string) {
  const studentRes = await pool.query(
    'SELECT id, name FROM students WHERE teacher_id = $1 ORDER BY name',
    [teacherId]
  );
  const students = studentRes.rows;

  const attendanceRes = await pool.query(
    `
    SELECT s.name, a.status
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE s.teacher_id = $1 AND a.date = $2
    `,
    [teacherId, date]
  );

  const attendanceMap = Object.fromEntries(
    attendanceRes.rows.map((r: any) => [r.name, r.status])
  );

  return students.map((s: any) => ({
    name: s.name,
    status: attendanceMap[s.name] ?? null,
  }));
}

/* ===========================
   POINTS (Option A helpers)
   =========================== */

export type StudentPointsUpdate = { name: string; points: number };

/**
 * Get points for all students in a class.
 * Assumes `students.points INTEGER NOT NULL DEFAULT 0` exists.
 */
export async function getStudentPoints(teacherId: number) {
  const { rows } = await pool.query(
    `
    SELECT name, points
    FROM students
    WHERE teacher_id = $1
    ORDER BY name ASC
    `,
    [teacherId]
  );
  return rows as { name: string; points: number }[];
}

/**
 * Bulk update points for many students in a class.
 * Any negative values are clamped to 0.
 */
export async function bulkUpdateStudentPoints(
  teacherId: number,
  updates: StudentPointsUpdate[]
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { name, points } of updates) {
      const safePoints = Math.max(0, Number(points) || 0);
      await client.query(
        `
        UPDATE students
        SET points = $1
        WHERE teacher_id = $2 AND name = $3
        `,
        [safePoints, teacherId, name]
      );
      // If you want to create the student automatically when missing, swap the UPDATE with:
      // await client.query(
      //   `
      //   INSERT INTO students (name, teacher_id, points)
      //   VALUES ($1, $2, $3)
      //   ON CONFLICT (name, teacher_id)
      //   DO UPDATE SET points = EXCLUDED.points
      //   `,
      //   [name, teacherId, safePoints]
      // );
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
