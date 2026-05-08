import fs from "fs";
import path from "path";

export const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");

export function parseSubmissionId(id: string): number | null {
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

export function toPublicModelCoverUrl(submissionId: number): string {
  return `/api/models/${submissionId}/cover`;
}

export function toPublicModelPreviewUrl(submissionId: number): string {
  return `/api/models/${submissionId}/preview`;
}

export function toAdminSubmissionCoverUrl(submissionId: number): string {
  return `/api/admin/submissions/${submissionId}/cover`;
}

export function resolveUploadFilePath(filePath: string): string {
  const absoluteFilePath = path.resolve(uploadsDir, filePath);
  const relativePath = path.relative(uploadsDir, absoluteFilePath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Upload file path must stay inside the uploads directory.");
  }

  return absoluteFilePath;
}

export function toRelativeUploadPath(absoluteFilePath: string): string {
  const relativePath = path.relative(uploadsDir, absoluteFilePath).replace(/\\/g, "/");

  if (!relativePath || relativePath.startsWith("..")) {
    throw new Error("Upload file path must stay inside the uploads directory.");
  }

  return relativePath;
}

export function getStoredFileName(filePath: string): string {
  return path.basename(filePath);
}

export function removeUploadFile(filePath: string): void {
  const absoluteFilePath = resolveUploadFilePath(filePath);

  if (fs.existsSync(absoluteFilePath)) {
    fs.unlinkSync(absoluteFilePath);
  }
}
