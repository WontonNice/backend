// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { pool } from "./db";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

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
app.get("/api/auth/db", async (_req, res) => {
  try {
    const r = await pool.query("SELECT current_database() AS db, version() AS version");
    res
      .type("application/json")
      .status(200)
      .send(JSON.stringify({ ok: true, info: r.rows[0] }));
  } catch (e: any) {
    console.error("DB_PROBE_ERROR:", e);
    const code = e?.code ?? "";
    const msg = e?.message ?? "";
    // send plain text so browsers don't hide it
    res
      .type("text/plain")
      .status(500)
      .send(`DB_FAIL code=${code} message=${msg}`);
  }
});


// Mount routes
app.use("/api/auth", authRouter);

// Start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log("Server listening on", PORT));
