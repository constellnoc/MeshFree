import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import multer from "multer";

const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const coversDir = path.join(uploadsDir, "covers");
const modelsDir = path.join(uploadsDir, "models");
const maxModelZipSize = 20 * 1024 * 1024;

for (const directory of [uploadsDir, coversDir, modelsDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

function createUniqueFileName(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    if (file.fieldname === "cover") {
      callback(null, coversDir);
      return;
    }

    callback(null, modelsDir);
  },
  filename: (_req, file, callback) => {
    callback(null, createUniqueFileName(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxModelZipSize,
    files: 2,
  },
});

export const submissionUpload = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "modelZip", maxCount: 1 },
]);

export function uploadSubmissionFiles(req: Request, res: Response, next: NextFunction) {
  submissionUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({
        message: "Invalid file type or file size exceeds the limit.",
      });
      return;
    }

    res.status(400).json({
      message: "Failed to process uploaded files.",
    });
  });
}
