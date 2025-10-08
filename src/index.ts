// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { pool } from "./db";

const app = express();

app.use(express.json());

app.use(cors({
  origin: ["http://localhost:5173", "https://frontend-tgl3.onrender.com"],
  credentials: true,
}));

// Health & debug
app.get("/healthz", (_req, res) => res.send("ok"));
app.post("/api/auth/echo", (req, res) => res.json({ got: req.body ?? null, v: "A2" }));
app.get("/api/auth/db", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ db: "ok", v: "A3" }); }
  catch (e:any) { res.status(500).json({ db: "fail", code: e.code, message: e.message, v: "A3" }); }
});
app.get("/api/auth/users-latest", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, username, created_at FROM users ORDER BY id DESC LIMIT 5`);
    res.json({ users: rows });
  } catch (e:any) {
    res.status(500).json({ error: "select fail", code: e.code, message: e.message });
  }
});

// Mount routes
app.use("/api/auth", authRouter);

// Start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log("Server listening on", PORT));
