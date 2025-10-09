// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import dns from "dns";
import authRouter from "./routes/auth"; // assuming auth.ts is in same folder, adjust if needed

dns.setDefaultResultOrder("ipv4first"); // prefer IPv4 to avoid ENETUNREACH

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://frontend-tgl3.onrender.com",
    ],
  })
);

// Simple health check
app.get("/healthz", (_req, res) => res.send("ok"));

// Auth routes
app.use("/api/auth", authRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
