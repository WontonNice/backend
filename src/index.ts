import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import attendanceRoutes from './routes/attendance';
import teacherRoutes from './routes/teachers';
import studentRoutes from './routes/students'; // ✅ import first

dotenv.config();
const app = express(); // ✅ define app BEFORE using it

app.use(cors());
app.use(express.json());

// ✅ all routes
app.use('/api', attendanceRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes); // ✅ this line is now safe

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
