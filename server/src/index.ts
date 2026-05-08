import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";

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

class CorsForbiddenError extends Error {
  constructor() {
    super("Origin is not allowed by CORS.");
    this.name = "CorsForbiddenError";
  }
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function isJsonSyntaxError(error: unknown): error is SyntaxError & { status?: number; body?: unknown } {
  return (
    error instanceof SyntaxError &&
    (error as { status?: unknown }).status === 400 &&
    "body" in (error as unknown as Record<string, unknown>)
  );
}

function setBaselineSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}

function setAdminNoStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store");
  next();
}

function handleApiNotFound(_req: Request, res: Response): void {
  res.status(404).json({
    message: "API route not found.",
  });
}

function handleUploadsNotFound(_req: Request, res: Response): void {
  res.status(404).json({
    message: "File not found.",
  });
}

function handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof CorsForbiddenError) {
    res.status(403).json({
      message: error.message,
    });
    return;
  }

  if (isJsonSyntaxError(error)) {
    res.status(400).json({
      message: "Invalid JSON request body.",
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Internal server error.",
  });
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

app.disable("x-powered-by");
app.set("trust proxy", 1);

for (const directory of [uploadsDir, coversDir, modelsDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

app.use(setBaselineSecurityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new CorsForbiddenError());
    },
  }),
);
app.use(express.json());
app.use("/api/admin", setAdminNoStore);
app.use("/uploads", handleUploadsNotFound);

app.get("/", (_req, res) => {
  res.json({
    message: "MeshFree server is running",
  });
});

app.use("/api/models", modelRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", handleApiNotFound);
app.use(handleError);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
