// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import dns from "dns";
import authRouter from "./routes/auth"; // ✅ adjust if your file is in /routes/auth.ts

dns.setDefaultResultOrder("ipv4first"); // prefer IPv4 to avoid ENETUNREACH errors on Render

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",               // local dev frontend
      "https://frontend-tgl3.onrender.com",  // deployed frontend
    ],
  })
);

// ✅ Health check (for uptime monitoring)
app.get("/healthz", (_req, res) => res.send("ok"));

// ✅ Auth routes
app.use("/api/auth", authRouter);

// ✅ Start server
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
