import crypto from "crypto";
import fs from "fs";
import path from "path";

import AdmZip from "adm-zip";
import type { IZipEntry } from "adm-zip";

import { toRelativeUploadPath, uploadsDir } from "./uploads";

const previewModelsDir = path.join(uploadsDir, "previews");

export class InvalidZipArchiveError extends Error {
  constructor(message = "Uploaded model ZIP is invalid.") {
    super(message);
    this.name = "InvalidZipArchiveError";
  }
}

function ensurePreviewDirectory() {
  fs.mkdirSync(previewModelsDir, { recursive: true });
}

function createPreviewFileName(entryName: string): string {
  const extension = path.extname(entryName).toLowerCase() || ".glb";
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function getPreviewEntry(zip: AdmZip): IZipEntry | undefined {
  return zip
    .getEntries()
    .find((entry: IZipEntry) => !entry.isDirectory && entry.entryName.replace(/\\/g, "/").toLowerCase().endsWith(".glb"));
}

export function extractPreviewModelFromZip(zipFilePath: string): string | null {
  let zip: AdmZip;

  try {
    zip = new AdmZip(zipFilePath);
  } catch (error) {
    throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
  }

  const previewEntry = getPreviewEntry(zip);

  if (!previewEntry) {
    return null;
  }

  ensurePreviewDirectory();

  const previewFileName = createPreviewFileName(previewEntry.entryName);
  const absolutePreviewPath = path.join(previewModelsDir, previewFileName);

  try {
    const previewBuffer = previewEntry.getData();
    fs.writeFileSync(absolutePreviewPath, previewBuffer);
  } catch (error) {
    if (fs.existsSync(absolutePreviewPath)) {
      fs.unlinkSync(absolutePreviewPath);
    }

    throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
  }

  return toRelativeUploadPath(absolutePreviewPath);
}
