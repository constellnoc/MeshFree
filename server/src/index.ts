import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import adminRoutes from "./routes/admin";
import modelRoutes from "./routes/models";
import submissionRoutes from "./routes/submissions";
import tagRoutes from "./routes/tags";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const uploadsDir = path.resolve(__dirname, "..", "uploads");
const coversDir = path.join(uploadsDir, "covers");
const modelsDir = path.join(uploadsDir, "models");
const isProduction = process.env.NODE_ENV === "production";

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

const defaultAllowedOrigins = isProduction
  ? ["https://yukiho.site", "https://www.yukiho.site"]
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

if (allowedOrigins.size === 0) {
  for (const origin of defaultAllowedOrigins) {
    allowedOrigins.add(origin);
  }
}

app.set("trust proxy", 1);

for (const directory of [uploadsDir, coversDir, modelsDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/", (_req, res) => {
  res.json({
    message: "MeshFree server is running",
  });
});

app.use("/api/models", modelRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
