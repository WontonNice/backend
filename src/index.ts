// backend/src/index.ts
import dotenv from "dotenv";
dotenv.config({ override: true });           // allow .env to override OS vars

import express from "express";
import cors from "cors";
import dns from "dns";
import authRouter from "./routes/auth";

dns.setDefaultResultOrder("ipv4first"); // prefer IPv4 to avoid ENETUNREACH

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Routes
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.use(express.json());
app.use("/api/auth", authRouter);

// Pick port: prefer SERVER_PORT, then PORT, then 3001
const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 3001);

// Listen on IPv4 explicitly (Windows-friendly)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
