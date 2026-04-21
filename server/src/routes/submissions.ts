import fs from "fs";
import path from "path";
import { Router } from "express";

import { InvalidZipArchiveError, extractPreviewModelFromZip } from "../lib/modelPreview";
import prisma from "../lib/prisma";
import {
  InvalidSubmissionTagsError,
  normalizeAndValidateSelectedTagSlugs,
  normalizeAndValidateSuggestedTags,
  syncPresetTags,
} from "../lib/tags";
import { removeUploadFile, toRelativeUploadPath } from "../lib/uploads";
import { createRateLimitMiddleware } from "../middleware/rateLimit";
import { uploadSubmissionFiles } from "../middleware/upload";

const router = Router();

const maxCoverSize = 2 * 1024 * 1024;
const maxModelZipSize = 50 * 1024 * 1024;
const allowedCoverExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const submissionRateLimit = createRateLimitMiddleware({
  windowMs: 10 * 60 * 1000,
  maxRequests: 3,
  message: "Too many submission attempts. Please try again later.",
});

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

function buildSubmissionTagCreateInput(tags: string[]) {
  return tags.map((tagName) => ({
    tag: {
      connect: {
        name: tagName,
      },
    },
  }));
}

function buildSubmissionRawTagCreateInput(tags: string[]) {
  return tags.map((tagValue) => ({
    value: tagValue,
    normalizedValue: tagValue,
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

router.post("/", submissionRateLimit, uploadSubmissionFiles, async (req, res) => {
  const { cover = [], modelZip = [] } = req.files as UploadedSubmissionFiles;
  const coverFile = cover[0];
  const modelZipFile = modelZip[0];
  const title = trimTextField(req.body.title);
  const description = trimTextField(req.body.description);
  const contact = trimTextField(req.body.contact);
  let selectedTagSlugs: string[] = [];
  let suggestedTags: string[] = [];
  let previewModelPath: string | null = null;

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
    await syncPresetTags(prisma);
    selectedTagSlugs = normalizeAndValidateSelectedTagSlugs(req.body.selectedTagSlugs);
    suggestedTags = normalizeAndValidateSuggestedTags(req.body.suggestedTags ?? req.body.tags);
    await assertTagSlugsExist(selectedTagSlugs);
    previewModelPath = extractPreviewModelFromZip(modelZipFile.path);

    const submission = await prisma.submission.create({
      data: {
        title,
        description,
        contact,
        coverImagePath: toRelativeUploadPath(coverFile.path),
        modelZipPath: toRelativeUploadPath(modelZipFile.path),
        previewModelPath,
        ...(selectedTagSlugs.length > 0
          ? {
              tags: {
                create: buildSubmissionTagCreateInput(selectedTagSlugs),
              },
            }
          : {}),
        ...(suggestedTags.length > 0
          ? {
              rawTags: {
                create: buildSubmissionRawTagCreateInput(suggestedTags),
              },
            }
          : {}),
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

    if (previewModelPath) {
      removeUploadFile(previewModelPath);
    }

    if (error instanceof InvalidZipArchiveError) {
      res.status(400).json({
        message: "Uploaded ZIP could not be read.",
      });
      return;
    }

    if (error instanceof InvalidSubmissionTagsError) {
      res.status(400).json({
        message: error.message,
      });
      return;
    }

    console.error("Failed to create submission.");
    console.error(error);
    res.status(500).json({
      message: "Failed to save submission.",
    });
  }
});

export default router;
