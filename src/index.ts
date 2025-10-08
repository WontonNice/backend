import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";

import { pool } from "./db";

const app = express();
app.use(express.json());

app.use(cors({
  origin: ["http://localhost:5173", "https://frontend-tgl3.onrender.com"],
  credentials: true
}));

app.post("/api/auth/echo", (req, res) => {
  res.json({ got: req.body ?? null, v: "A2" });
});

//import { pool } from "./db";

app.get("/api/auth/health", (_req, res) => res.json({ ok: true }));

app.get("/api/auth/db", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ db: "ok" }); }
  catch (e:any) { res.status(500).json({ db: "fail", code: e.code, message: e.message }); }
});

app.use("/api/auth", authRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Server on ${PORT}`));
