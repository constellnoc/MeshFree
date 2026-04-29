import fs from "fs";

import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import type { Prisma, PrismaClient } from "../generated/prisma/client";

import prisma from "../lib/prisma";
import {
  defaultTagLocale,
  InvalidSubmissionTagsError,
  mapSubmissionTags,
  normalizeAndValidateSelectedTagSlugs,
  normalizeTagText,
  syncPresetTags,
  toPublicTag,
} from "../lib/tags";
import {
  getStoredFileName,
  parseSubmissionId,
  removeUploadFile,
  resolveUploadFilePath,
  toPublicAssetUrl,
} from "../lib/uploads";
import { authMiddleware } from "../middleware/auth";
import { createRateLimitMiddleware } from "../middleware/rateLimit";

const router = Router();
const allowedStatuses = new Set(["pending", "approved", "rejected"]);
const allowedScopeLevels = new Set(["broad", "medium", "specific"]);
const adminLoginRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many login attempts. Please try again later.",
});

class InvalidAdminActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAdminActionError";
  }
}

function trimTextField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveLocale(value: unknown) {
  return trimTextField(value) || defaultTagLocale;
}

function normalizeTagSlugInput(value: unknown) {
  return trimTextField(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SubmissionSourceFormat = "obj" | "fbx" | "dae" | "blend" | "glb" | "unknown";
type SubmissionPreviewConversionStatus = "not_attempted" | "success" | "warning" | "failed";

function toAdminSubmissionSummary(submission: {
  id: number;
  title: string;
  description: string;
  contact: string;
  coverImagePath: string;
  status: "pending" | "approved" | "rejected";
  rejectReason: string | null;
  sourceFormat: SubmissionSourceFormat;
  previewConversionStatus: SubmissionPreviewConversionStatus;
  previewConversionMessage: string | null;
  isPreviewEnabled: boolean;
  isPublicVisible: boolean;
  hasMissingTextures: boolean;
  createdAt: Date;
  reviewedAt: Date | null;
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
    contact: submission.contact,
    coverImageUrl: toPublicAssetUrl(submission.coverImagePath),
    status: submission.status,
    rejectReason: submission.rejectReason,
    sourceFormat: submission.sourceFormat,
    previewConversionStatus: submission.previewConversionStatus,
    previewConversionMessage: submission.previewConversionMessage,
    isPreviewEnabled: submission.isPreviewEnabled,
    isPublicVisible: submission.isPublicVisible,
    hasMissingTextures: submission.hasMissingTextures,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    tags: mapSubmissionTags(submission.tags, locale),
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
  sourceFormat: SubmissionSourceFormat;
  previewConversionStatus: SubmissionPreviewConversionStatus;
  previewConversionMessage: string | null;
  isPreviewEnabled: boolean;
  isPublicVisible: boolean;
  hasMissingTextures: boolean;
  createdAt: Date;
  reviewedAt: Date | null;
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
  rawTags: Array<{
    id: number;
    value: string;
    status: "pending" | "resolved" | "ignored";
    resolvedTag: {
      name: string;
      scopeLevel: "broad" | "medium" | "specific";
      translations: Array<{
        locale: string;
        displayName: string;
      }>;
    } | null;
  }>;
}, locale: string) {
  return {
    ...toAdminSubmissionSummary(submission, locale),
    modelZipName: getStoredFileName(submission.modelZipPath),
    rawTags: submission.rawTags.map((rawTag) => ({
      id: rawTag.id,
      value: rawTag.value,
      status: rawTag.status,
      resolvedTag: rawTag.resolvedTag ? toPublicTag(rawTag.resolvedTag, locale) : null,
    })),
  };
}

type ManagedTagPayload = {
  slug: string;
  displayNameEn: string;
  displayNameZh: string;
  scopeLevel: "broad" | "medium" | "specific";
};

function buildSubmissionTagCreateInput(tagSlugs: string[]) {
  return tagSlugs.map((tagSlug) => ({
    tag: {
      connect: {
        name: tagSlug,
      },
    },
  }));
}

async function assertTagSlugsExist(tagSlugs: string[]) {
  if (tagSlugs.length === 0) {
    return;
  }

  const existingTags = await prisma.tag.findMany({
    where: {
      name: {
        in: tagSlugs,
      },
    },
    select: {
      name: true,
    },
  });

  if (existingTags.length !== tagSlugs.length) {
    throw new InvalidSubmissionTagsError("One or more selected tags are no longer available.");
  }
}

function parseManagedTagPayload(body: Record<string, unknown>): ManagedTagPayload {
  const slug = normalizeTagSlugInput(body.slug);
  const displayNameEn = trimTextField(body.displayNameEn);
  const displayNameZh = trimTextField(body.displayNameZh);
  const scopeLevel = trimTextField(body.scopeLevel);

  if (!slug) {
    throw new InvalidAdminActionError("Please provide a valid tag slug.");
  }

  if (!displayNameEn || !displayNameZh) {
    throw new InvalidAdminActionError("Please provide both English and Chinese tag names.");
  }

  if (!allowedScopeLevels.has(scopeLevel)) {
    throw new InvalidAdminActionError("Please provide a valid tag scope.");
  }

  return {
    slug,
    displayNameEn,
    displayNameZh,
    scopeLevel: scopeLevel as ManagedTagPayload["scopeLevel"],
  };
}

async function createManagedTag(
  client: PrismaClient | Prisma.TransactionClient,
  payload: ManagedTagPayload,
) {
  const existingTag = await client.tag.findUnique({
    where: {
      name: payload.slug,
    },
    select: {
      id: true,
    },
  });

  if (existingTag) {
    throw new InvalidAdminActionError("Tag slug already exists.");
  }

  const tag = await client.tag.create({
    data: {
      name: payload.slug,
      scopeLevel: payload.scopeLevel,
    },
    select: {
      id: true,
      name: true,
      scopeLevel: true,
    },
  });

  await client.tagTranslation.createMany({
    data: [
      {
        tagId: tag.id,
        locale: "en",
        displayName: payload.displayNameEn,
        normalizedDisplayName: normalizeTagText(payload.displayNameEn),
      },
      {
        tagId: tag.id,
        locale: "zh-CN",
        displayName: payload.displayNameZh,
        normalizedDisplayName: normalizeTagText(payload.displayNameZh),
      },
    ],
  });

  return client.tag.findUniqueOrThrow({
    where: {
      id: tag.id,
    },
    select: {
      id: true,
      name: true,
      scopeLevel: true,
      translations: {
        select: {
          locale: true,
          displayName: true,
        },
      },
    },
  });
}

async function getAdminSubmissionDetailRecord(submissionId: number) {
  return prisma.submission.findUnique({
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
      sourceFormat: true,
      previewConversionStatus: true,
      previewConversionMessage: true,
      isPreviewEnabled: true,
      isPublicVisible: true,
      hasMissingTextures: true,
      createdAt: true,
      reviewedAt: true,
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
      rawTags: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          value: true,
          status: true,
          resolvedTag: {
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
  const locale = resolveLocale(req.query.locale);

  if (status && !allowedStatuses.has(status)) {
    res.status(400).json({
      message: "Invalid request data.",
    });
    return;
  }

  await syncPresetTags(prisma);
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
      sourceFormat: true,
      previewConversionStatus: true,
      previewConversionMessage: true,
      isPreviewEnabled: true,
      isPublicVisible: true,
      hasMissingTextures: true,
      createdAt: true,
      reviewedAt: true,
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

  res.json(submissions.map((submission) => toAdminSubmissionSummary(submission, locale)));
});

router.get("/submissions/:id", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  await syncPresetTags(prisma);
  const submission = await getAdminSubmissionDetailRecord(submissionId);

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  res.json(toAdminSubmissionDetail(submission, locale));
});

router.post("/tags", async (req, res) => {
  const locale = resolveLocale(req.query.locale);

  try {
    await syncPresetTags(prisma);
    const payload = parseManagedTagPayload((req.body ?? {}) as Record<string, unknown>);
    const tag = await createManagedTag(prisma, payload);

    res.status(201).json({
      message: "Admin tag created successfully.",
      tag: toPublicTag(tag, locale),
    });
  } catch (error) {
    if (error instanceof InvalidAdminActionError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }
});

router.patch("/raw-tags/:id/ignore", async (req, res) => {
  const rawTagId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);

  if (!rawTagId) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  const rawTag = await prisma.submissionRawTag.findUnique({
    where: {
      id: rawTagId,
    },
    select: {
      id: true,
      submissionId: true,
    },
  });

  if (!rawTag) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  await prisma.submissionRawTag.update({
    where: {
      id: rawTagId,
    },
    data: {
      status: "ignored",
      resolvedTagId: null,
    },
  });

  const submission = await getAdminSubmissionDetailRecord(rawTag.submissionId);

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  res.json({
    message: "Custom tag ignored successfully.",
    submission: toAdminSubmissionDetail(submission, locale),
  });
});

router.patch("/raw-tags/:id/resolve-existing", async (req, res) => {
  const rawTagId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);
  const tagSlug = normalizeTagSlugInput(req.body?.tagSlug);

  if (!rawTagId) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  if (!tagSlug) {
    res.status(400).json({
      message: "Please select a public tag.",
    });
    return;
  }

  const rawTag = await prisma.submissionRawTag.findUnique({
    where: {
      id: rawTagId,
    },
    select: {
      id: true,
      submissionId: true,
    },
  });

  if (!rawTag) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  const targetTag = await prisma.tag.findUnique({
    where: {
      name: tagSlug,
    },
    select: {
      id: true,
    },
  });

  if (!targetTag) {
    res.status(404).json({
      message: "Public tag not found.",
    });
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.submissionRawTag.update({
      where: {
        id: rawTagId,
      },
      data: {
        status: "resolved",
        resolvedTagId: targetTag.id,
      },
    });

    await transaction.submissionTag.upsert({
      where: {
        submissionId_tagId: {
          submissionId: rawTag.submissionId,
          tagId: targetTag.id,
        },
      },
      update: {},
      create: {
        submissionId: rawTag.submissionId,
        tagId: targetTag.id,
      },
    });
  });

  const submission = await getAdminSubmissionDetailRecord(rawTag.submissionId);

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  res.json({
    message: "Custom tag resolved successfully.",
    submission: toAdminSubmissionDetail(submission, locale),
  });
});

router.post("/raw-tags/:id/create-tag", async (req, res) => {
  const rawTagId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);

  if (!rawTagId) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  const rawTag = await prisma.submissionRawTag.findUnique({
    where: {
      id: rawTagId,
    },
    select: {
      id: true,
      submissionId: true,
    },
  });

  if (!rawTag) {
    res.status(404).json({
      message: "Custom tag not found.",
    });
    return;
  }

  try {
    const payload = parseManagedTagPayload((req.body ?? {}) as Record<string, unknown>);

    await prisma.$transaction(async (transaction) => {
      const createdTag = await createManagedTag(transaction, payload);

      await transaction.submissionRawTag.update({
        where: {
          id: rawTagId,
        },
        data: {
          status: "resolved",
          resolvedTagId: createdTag.id,
        },
      });

      await transaction.submissionTag.upsert({
        where: {
          submissionId_tagId: {
            submissionId: rawTag.submissionId,
            tagId: createdTag.id,
          },
        },
        update: {},
        create: {
          submissionId: rawTag.submissionId,
          tagId: createdTag.id,
        },
      });
    });

    const submission = await getAdminSubmissionDetailRecord(rawTag.submissionId);

    if (!submission) {
      res.status(404).json({
        message: "Submission not found.",
      });
      return;
    }

    res.status(201).json({
      message: "Custom tag converted successfully.",
      submission: toAdminSubmissionDetail(submission, locale),
    });
  } catch (error) {
    if (error instanceof InvalidAdminActionError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }
});

router.get("/submissions/:id/download", async (req, res) => {
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
      title: true,
      modelZipPath: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  const absoluteZipPath = resolveUploadFilePath(submission.modelZipPath);

  if (!fs.existsSync(absoluteZipPath)) {
    res.status(404).json({
      message: "Model ZIP file not found.",
    });
    return;
  }

  const downloadName = getStoredFileName(submission.modelZipPath) || `${submission.title}.zip`;
  res.download(absoluteZipPath, downloadName);
});

router.patch("/submissions/:id/tags", async (req, res) => {
  const submissionId = parseSubmissionId(req.params.id);
  const locale = resolveLocale(req.query.locale);

  if (!submissionId) {
    res.status(404).json({
      message: "Submission not found.",
    });
    return;
  }

  try {
    await syncPresetTags(prisma);
    const tagSlugs = normalizeAndValidateSelectedTagSlugs(req.body.selectedTagSlugs ?? req.body.tags);
    await assertTagSlugsExist(tagSlugs);
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      select: {
        id: true,
      },
    });

    if (!existingSubmission) {
      res.status(404).json({
        message: "Submission not found.",
      });
      return;
    }

    const submission = await prisma.submission.update({
      where: {
        id: submissionId,
      },
      data: {
        tags: {
          deleteMany: {},
          ...(tagSlugs.length > 0
            ? {
                create: buildSubmissionTagCreateInput(tagSlugs),
              }
            : {}),
        },
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
        sourceFormat: true,
        previewConversionStatus: true,
        previewConversionMessage: true,
        isPreviewEnabled: true,
        isPublicVisible: true,
        hasMissingTextures: true,
        createdAt: true,
        reviewedAt: true,
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
        rawTags: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            value: true,
            status: true,
            resolvedTag: {
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

    res.json({
      message: "Submission tags updated successfully.",
      submission: toAdminSubmissionDetail(submission, locale),
    });
  } catch (error) {
    if (error instanceof InvalidSubmissionTagsError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }
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
      isPublicVisible: true,
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
      isPublicVisible: false,
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
      previewModelPath: true,
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

  for (const filePath of [submission.coverImagePath, submission.modelZipPath, submission.previewModelPath]) {
    if (!filePath) {
      continue;
    }

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
