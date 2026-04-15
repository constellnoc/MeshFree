import fs from "fs";
import { Router } from "express";

import prisma from "../lib/prisma";
import {
  getStoredFileName,
  parseSubmissionId,
  resolveUploadFilePath,
  toPublicAssetUrl,
} from "../lib/uploads";

const router = Router();

function toModelSummary(submission: {
  id: number;
  title: string;
  description: string;
  coverImagePath: string;
  createdAt: Date;
}) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    coverImageUrl: toPublicAssetUrl(submission.coverImagePath),
    createdAt: submission.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "approved",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverImagePath: true,
      createdAt: true,
    },
  });

  res.json(submissions.map(toModelSummary));
});

router.get("/:id", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);

  if (!submissionId) {
    res.status(404).json({
      message: "Model not found.",
    });
    return;
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      status: "approved",
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverImagePath: true,
      createdAt: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Model not found.",
    });
    return;
  }

  res.json(toModelSummary(submission));
});

router.get("/:id/download", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);

  if (!submissionId) {
    res.status(404).json({
      message: "Model not found or not available for download.",
    });
    return;
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      status: "approved",
    },
    select: {
      title: true,
      modelZipPath: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Model not found or not available for download.",
    });
    return;
  }

  const absoluteZipPath = resolveUploadFilePath(submission.modelZipPath);

  if (!fs.existsSync(absoluteZipPath)) {
    res.status(404).json({
      message: "Model not found or not available for download.",
    });
    return;
  }

  const downloadName = getStoredFileName(submission.modelZipPath) || `${submission.title}.zip`;
  res.download(absoluteZipPath, downloadName);
});

export default router;
