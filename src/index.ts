import express from "express";
import cors from "cors";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173", "https://frontend-tgl3.onrender.com"] }));

app.get("/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.send("ok"); }
  catch { res.status(500).send("db error"); }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Server on ${PORT}`));
