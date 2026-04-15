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

export function toPublicAssetUrl(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/uploads/${normalizedPath}`;
}

export function resolveUploadFilePath(filePath: string): string {
  return path.resolve(uploadsDir, filePath);
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
