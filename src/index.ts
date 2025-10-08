import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://frontend-tgl3.onrender.com"  // your backend host; add your frontend host too if different
  ],
  credentials: true
}));

app.use("/api/auth", authRouter);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
