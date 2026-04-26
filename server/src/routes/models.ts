import fs from "fs";
import { Router } from "express";

import prisma from "../lib/prisma";
import {
  defaultTagLocale,
  InvalidSubmissionTagsError,
  mapSubmissionTags,
  normalizeTagText,
  normalizeTagFilters,
  syncPresetTags,
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

function resolveLocale(value: unknown) {
  return trimTextField(value) || defaultTagLocale;
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
      scopeLevel: "broad" | "medium" | "specific";
      translations: Array<{
        locale: string;
        displayName: string;
      }>;
    };
  }>;
}, locale: string) {
  return {
    id: submission.id,
    title: submission.title,
    description: submission.description,
    coverImageUrl: toPublicAssetUrl(submission.coverImagePath),
    createdAt: submission.createdAt.toISOString(),
    tags: mapSubmissionTags(submission.tags, locale),
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
      scopeLevel: "broad" | "medium" | "specific";
      translations: Array<{
        locale: string;
        displayName: string;
      }>;
    };
  }>;
}, locale: string) {
  return {
    ...toModelSummary(submission, locale),
    previewModelUrl: submission.previewModelPath ? toPublicAssetUrl(submission.previewModelPath) : null,
  };
}

router.get("/", async (req, res) => {
  const query = trimTextField(req.query.q);
  const requestedTags = req.query.tag;
  const locale = resolveLocale(req.query.locale);

  let normalizedTags: string[] = [];

  try {
    await syncPresetTags(prisma);
    normalizedTags = normalizeTagFilters(requestedTags);
  } catch (error) {
    if (error instanceof InvalidSubmissionTagsError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }

  const normalizedQuery = query ? normalizeTagText(query) : "";
  const submissions = await prisma.submission.findMany({
    where: {
      status: "approved",
      ...(query || normalizedTags.length > 0
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
                              OR: [
                                {
                                  name: {
                                    contains: normalizedQuery,
                                  },
                                },
                                {
                                  translations: {
                                    some: {
                                      normalizedDisplayName: {
                                        contains: normalizedQuery,
                                      },
                                    },
                                  },
                                },
                                {
                                  aliases: {
                                    some: {
                                      normalizedValue: {
                                        contains: normalizedQuery,
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ],
                  }
                : {},
              normalizedTags.length > 0
                ? {
                    AND: normalizedTags.map((normalizedTag) => ({
                      tags: {
                        some: {
                          tag: {
                            name: normalizedTag,
                          },
                        },
                      },
                    })),
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
              scopeLevel: true,
              translations: {
                select: {
                  locale: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  res.json(submissions.map((submission) => toModelSummary(submission, locale)));
});

router.get("/:id", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);

  if (!submissionId) {
    res.status(404).json({
      message: "Model not found.",
    });
    return;
  }

  await syncPresetTags(prisma);
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
              scopeLevel: true,
              translations: {
                select: {
                  locale: true,
                  displayName: true,
                },
              },
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

  res.json(toModelDetail(submission, locale));
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
