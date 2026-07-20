import express from "express";
import cors from "cors";
import routes from "@/routes";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://inventory-frontend-wheat-theta.vercel.app",
    "https://inventory-frontend-294m8i6cr-totalstock1.vercel.app",
    process.env.FRONTEND_URL || "",
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
