import fs from "fs";
import path from "path";
import { Router } from "express";

import prisma from "../lib/prisma";
import { toRelativeUploadPath } from "../lib/uploads";
import { uploadSubmissionFiles } from "../middleware/upload";

const router = Router();

const maxCoverSize = 2 * 1024 * 1024;
const maxModelZipSize = 20 * 1024 * 1024;
const allowedCoverExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type UploadedSubmissionFiles = {
  cover?: Express.Multer.File[];
  modelZip?: Express.Multer.File[];
};

function trimTextField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function removeUploadedFiles(files: Array<Express.Multer.File | undefined>) {
  for (const file of files) {
    if (!file) {
      continue;
    }

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

function isValidCoverFile(file: Express.Multer.File): boolean {
  const extension = path.extname(file.originalname).toLowerCase();
  return allowedCoverExtensions.has(extension);
}

function isValidZipFile(file: Express.Multer.File): boolean {
  return path.extname(file.originalname).toLowerCase() === ".zip";
}

router.post("/", uploadSubmissionFiles, async (req, res) => {
  const { cover = [], modelZip = [] } = req.files as UploadedSubmissionFiles;
  const coverFile = cover[0];
  const modelZipFile = modelZip[0];
  const title = trimTextField(req.body.title);
  const description = trimTextField(req.body.description);
  const contact = trimTextField(req.body.contact);

  if (!title || !description || !contact || !coverFile || !modelZipFile) {
    removeUploadedFiles([coverFile, modelZipFile]);
    res.status(400).json({
      message: "Invalid request data.",
    });
    return;
  }

  if (!isValidCoverFile(coverFile) || coverFile.size > maxCoverSize) {
    removeUploadedFiles([coverFile, modelZipFile]);
    res.status(400).json({
      message: "Invalid file type or file size exceeds the limit.",
    });
    return;
  }

  if (!isValidZipFile(modelZipFile) || modelZipFile.size > maxModelZipSize) {
    removeUploadedFiles([coverFile, modelZipFile]);
    res.status(400).json({
      message: "Invalid file type or file size exceeds the limit.",
    });
    return;
  }

  try {
    const submission = await prisma.submission.create({
      data: {
        title,
        description,
        contact,
        coverImagePath: toRelativeUploadPath(coverFile.path),
        modelZipPath: toRelativeUploadPath(modelZipFile.path),
      },
      select: {
        id: true,
        status: true,
      },
    });

    res.status(201).json({
      message: "Submission received successfully. Please wait for admin review.",
      submissionId: submission.id,
      status: submission.status,
    });
  } catch (error) {
    removeUploadedFiles([coverFile, modelZipFile]);
    console.error("Failed to create submission.");
    console.error(error);
    res.status(500).json({
      message: "Failed to save submission.",
    });
  }
});

export default router;
