import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";

import prisma from "../lib/prisma";
import {
  getStoredFileName,
  parseSubmissionId,
  removeUploadFile,
  toPublicAssetUrl,
} from "../lib/uploads";
import { authMiddleware } from "../middleware/auth";
import { createRateLimitMiddleware } from "../middleware/rateLimit";

const router = Router();
const allowedStatuses = new Set(["pending", "approved", "rejected"]);
const adminLoginRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many login attempts. Please try again later.",
});

function trimTextField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toAdminSubmissionSummary(submission: {
  id: number;
  title: string;
  description: string;
  contact: string;
  coverImagePath: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    contact: submission.contact,
    coverImageUrl: toPublicAssetUrl(submission.coverImagePath),
    status: submission.status,
    rejectReason: submission.rejectReason,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
  };
}

function toAdminSubmissionDetail(submission: {
  id: number;
  title: string;
  description: string;
  contact: string;
  coverImagePath: string;
  modelZipPath: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}) {
  return {
    ...toAdminSubmissionSummary(submission),
    modelZipName: getStoredFileName(submission.modelZipPath),
  };
}

router.post("/login", adminLoginRateLimit, async (req, res) => {
  const username = trimTextField(req.body.username);
  const password = trimTextField(req.body.password);
  const jwtSecret = process.env.JWT_SECRET;

  if (!username || !password) {
    res.status(400).json({
      message: "Invalid request data.",
    });
    return;
  }

  if (!jwtSecret) {
    res.status(500).json({
      message: "JWT secret is not configured.",
    });
    return;
  }

  const admin = await prisma.admin.findUnique({
    where: {
      username,
    },
  });

  if (!admin) {
    res.status(401).json({
      message: "Invalid username or password.",
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isPasswordValid) {
    res.status(401).json({
      message: "Invalid username or password.",
    });
    return;
  }

  const token = jwt.sign(
    { role: "admin", username: admin.username, adminId: admin.id },
    jwtSecret,
    {
      expiresIn: "1h",
    },
  );

  res.json({
    message: "Login successful.",
    token,
  });
});

router.use(authMiddleware);

router.get("/submissions", async (req, res) => {
  const status = trimTextField(req.query.status);

  if (status && !allowedStatuses.has(status)) {
    res.status(400).json({
      message: "Invalid request data.",
    });
    return;
  }

  const submissions = await prisma.submission.findMany({
    where: status
      ? {
          status: status as "pending" | "approved" | "rejected",
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      contact: true,
      coverImagePath: true,
      status: true,
      rejectReason: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  res.json(submissions.map(toAdminSubmissionSummary));
});

router.get("/submissions/:id", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      contact: true,
      coverImagePath: true,
      modelZipPath: true,
      status: true,
      rejectReason: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  res.json(toAdminSubmissionDetail(submission));
});

router.patch("/submissions/:id/approve", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      status: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  if (submission.status !== "pending") {
    res.status(400).json({
      message: "Only pending submissions can be reviewed.",
    });
    return;
  }

  await prisma.submission.update({
    where: {
      id: submissionId,
    },
    data: {
      status: "approved",
      rejectReason: null,
      reviewedAt: new Date(),
    },
  });

  res.json({
    message: "Submission approved successfully.",
  });
});

router.patch("/submissions/:id/reject", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);
  const rejectReason = trimTextField(req.body.rejectReason);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  if (!rejectReason) {
    res.status(400).json({
      message: "Invalid request data.",
    });
    return;
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      status: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  if (submission.status !== "pending") {
    res.status(400).json({
      message: "Only pending submissions can be reviewed.",
    });
    return;
  }

  await prisma.submission.update({
    where: {
      id: submissionId,
    },
    data: {
      status: "rejected",
      rejectReason,
      reviewedAt: new Date(),
    },
  });

  res.json({
    message: "Submission rejected successfully.",
  });
});

router.delete("/submissions/:id", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      coverImagePath: true,
      modelZipPath: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  await prisma.submission.delete({
    where: {
      id: submissionId,
    },
  });

  for (const filePath of [submission.coverImagePath, submission.modelZipPath]) {
    try {
      removeUploadFile(filePath);
    } catch (error) {
      console.error(`Failed to remove file after deleting submission: ${filePath}`);
      console.error(error);
    }
  }

  res.json({
    message: "Submission deleted successfully.",
  });
});

export default router;
