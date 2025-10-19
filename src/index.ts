// backend/src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import dns from "dns";
import authRouter from "./routes/auth";
import examLocksRouter from "./routes/ExamLock";

dns.setDefaultResultOrder("ipv4first"); // prefer IPv4 to avoid ENETUNREACH

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",              // local dev frontend
      //"https://frontend-tgl3.onrender.com", // Original Frontend
      "https://frontend-0s8v.onrender.com", //Temp New Frontend for now
    ],
    // If you ever use cookies/auth headers across origins, turn this on:
    // credentials: true,
  })
);

// Health check
app.get("/healthz", (_req, res) => res.send("ok"));

// Auth routes
app.use("/api/auth", authRouter);
app.use("/api/exams", examLocksRouter);

// Start server
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
