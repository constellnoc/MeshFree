import fs from "fs";
import { Router } from "express";

import prisma from "../lib/prisma";
import {
  InvalidSubmissionTagsError,
  mapSubmissionTags,
  normalizeTag,
  normalizeTagFilter,
} from "../lib/tags";
import {
  getStoredFileName,
  parseSubmissionId,
  resolveUploadFilePath,
  toPublicAssetUrl,
} from "../lib/uploads";

const router = Router();

function trimTextField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toModelSummary(submission: {
  id: number;
  title: string;
  description: string;
  coverImagePath: string;
  createdAt: Date;
  tags: Array<{
    tag: {
      name: string;
    };
  }>;
}) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    coverImageUrl: toPublicAssetUrl(submission.coverImagePath),
    createdAt: submission.createdAt.toISOString(),
    tags: mapSubmissionTags(submission.tags),
  };
}

function toModelDetail(submission: {
  id: number;
  title: string;
  description: string;
  coverImagePath: string;
  previewModelPath: string | null;
  createdAt: Date;
  tags: Array<{
    tag: {
      name: string;
    };
  }>;
}) {
  return {
    ...toModelSummary(submission),
    previewModelUrl: submission.previewModelPath ? toPublicAssetUrl(submission.previewModelPath) : null,
  };
}

router.get("/", async (req, res) => {
  const query = trimTextField(req.query.q);
  const requestedTag = trimTextField(req.query.tag);

  let normalizedTag: string | undefined;

  try {
    normalizedTag = requestedTag ? normalizeTagFilter(requestedTag) : undefined;
  } catch (error) {
    if (error instanceof InvalidSubmissionTagsError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }

  const normalizedQuery = query ? normalizeTag(query) : "";
  const submissions = await prisma.submission.findMany({
    where: {
      status: "approved",
      ...(query || normalizedTag
        ? {
            AND: [
              query
                ? {
                    OR: [
                      {
                        title: {
                          contains: query,
                        },
                      },
                      {
                        description: {
                          contains: query,
                        },
                      },
                      {
                        tags: {
                          some: {
                            tag: {
                              name: {
                                contains: normalizedQuery,
                              },
                            },
                          },
                        },
                      },
                    ],
                  }
                : {},
              normalizedTag
                ? {
                    tags: {
                      some: {
                        tag: {
                          name: normalizedTag,
                        },
                      },
                    },
                  }
                : {},
            ],
          }
        : {}),
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
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
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
      previewModelPath: true,
      createdAt: true,
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Model not found.",
    });
    return;
  }

  res.json(toModelDetail(submission));
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
