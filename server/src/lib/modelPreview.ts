import crypto from "crypto";
import fs from "fs";
import path from "path";

import AdmZip from "adm-zip";
import type { IZipEntry } from "adm-zip";

import { toRelativeUploadPath, uploadsDir } from "./uploads";

const previewModelsDir = path.join(uploadsDir, "previews");
const multipleCandidateMessage =
  "Detected multiple unrelated candidate model files in the ZIP. Automatic preview selection is not supported yet.";
const maxZipEntryCount = 200;
const maxZipTotalUncompressedSize = 200 * 1024 * 1024;
const maxZipSingleFileSize = 100 * 1024 * 1024;
const maxZipDirectoryDepth = 12;
const maxZipProcessingMs = 10_000;
const supportedSourceFormatsByExtension = {
  ".obj": "obj",
  ".fbx": "fbx",
  ".dae": "dae",
  ".blend": "blend",
  ".glb": "glb",
} as const;

type SupportedSourceExtension = keyof typeof supportedSourceFormatsByExtension;
type SupportedSourceFormat = (typeof supportedSourceFormatsByExtension)[SupportedSourceExtension];
type ZipEntryHeader = {
  encrypted?: boolean;
  size?: number;
};

export type ZipModelInspectionResult = {
  previewModelPath: string | null;
  candidateEntryName: string | null;
  sourceFormat: SupportedSourceFormat | "unknown";
  previewConversionStatus: "not_attempted" | "success" | "warning" | "failed";
  previewConversionMessage: string | null;
};

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

function getNormalizedEntryName(entry: IZipEntry): string {
  return entry.entryName.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getZipEntryHeader(entry: IZipEntry): ZipEntryHeader {
  return entry.header as ZipEntryHeader;
}

function getEntryUncompressedSize(entry: IZipEntry): number {
  const size = getZipEntryHeader(entry).size;

  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
    throw new InvalidZipArchiveError("ZIP entry size is invalid.");
  }

  return size;
}

function assertProcessingDeadline(startedAt: number): void {
  if (Date.now() - startedAt > maxZipProcessingMs) {
    throw new InvalidZipArchiveError("ZIP processing exceeded the time limit.");
  }
}

function assertEntryPathIsSafe(entryName: string): void {
  if (!entryName) {
    return;
  }

  const segments = entryName.split("/").filter(Boolean);

  if (segments.length > maxZipDirectoryDepth) {
    throw new InvalidZipArchiveError("ZIP entry directory depth exceeds the limit.");
  }

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new InvalidZipArchiveError("ZIP entry path must stay inside the archive root.");
  }
}

function validateZipArchive(zip: AdmZip, startedAt: number): void {
  const entries = zip.getEntries();
  let totalUncompressedSize = 0;
  let fileEntryCount = 0;

  if (entries.length > maxZipEntryCount) {
    throw new InvalidZipArchiveError("ZIP entry count exceeds the limit.");
  }

  for (const entry of entries) {
    assertProcessingDeadline(startedAt);

    const entryName = getNormalizedEntryName(entry);
    assertEntryPathIsSafe(entryName);

    if (getZipEntryHeader(entry).encrypted) {
      throw new InvalidZipArchiveError("Encrypted ZIP entries are not supported.");
    }

    if (entry.isDirectory) {
      continue;
    }

    const entrySize = getEntryUncompressedSize(entry);
    fileEntryCount += 1;

    if (entrySize > maxZipSingleFileSize) {
      throw new InvalidZipArchiveError("ZIP entry size exceeds the limit.");
    }

    totalUncompressedSize += entrySize;

    if (totalUncompressedSize > maxZipTotalUncompressedSize) {
      throw new InvalidZipArchiveError("ZIP uncompressed size exceeds the limit.");
    }
  }

  if (fileEntryCount === 0) {
    throw new InvalidZipArchiveError("ZIP archive does not contain files.");
  }
}

function getEntryExtension(entry: IZipEntry): string {
  return path.extname(getNormalizedEntryName(entry)).toLowerCase();
}

function isSupportedSourceExtension(extension: string): extension is SupportedSourceExtension {
  return extension in supportedSourceFormatsByExtension;
}

function getCandidateModelEntries(zip: AdmZip): IZipEntry[] {
  return zip.getEntries().filter((entry: IZipEntry) => {
    if (entry.isDirectory) {
      return false;
    }

    return isSupportedSourceExtension(getEntryExtension(entry));
  });
}

function getSourceFormatForEntry(entry: IZipEntry): SupportedSourceFormat {
  return supportedSourceFormatsByExtension[getEntryExtension(entry) as SupportedSourceExtension];
}

export function storePreviewBuffer(previewBuffer: Buffer, sourceEntryName: string): string {
  if (previewBuffer.length > maxZipSingleFileSize) {
    throw new InvalidZipArchiveError("Preview file size exceeds the limit.");
  }

  ensurePreviewDirectory();

  const previewFileName = createPreviewFileName(sourceEntryName);
  const absolutePreviewPath = path.join(previewModelsDir, previewFileName);

  try {
    fs.writeFileSync(absolutePreviewPath, previewBuffer);
  } catch (error) {
    if (fs.existsSync(absolutePreviewPath)) {
      fs.unlinkSync(absolutePreviewPath);
    }

    throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
  }

  return toRelativeUploadPath(absolutePreviewPath);
}

function extractPreviewEntry(entry: IZipEntry, startedAt: number): string {
  assertProcessingDeadline(startedAt);
  const previewBuffer = entry.getData();
  assertProcessingDeadline(startedAt);

  return storePreviewBuffer(previewBuffer, entry.entryName);
}

function loadZip(zipFilePath: string): AdmZip {
  try {
    return new AdmZip(zipFilePath);
  } catch (error) {
    throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
  }
}

function resolveExtractedZipPath(targetDirectory: string, entryName: string) {
  const absolutePath = path.resolve(targetDirectory, entryName);
  const relativePath = path.relative(targetDirectory, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new InvalidZipArchiveError("ZIP entry path must stay inside the extraction directory.");
  }

  return absolutePath;
}

export function extractZipArchiveToDirectory(zipFilePath: string, targetDirectory: string): void {
  const startedAt = Date.now();
  const zip = loadZip(zipFilePath);
  validateZipArchive(zip, startedAt);

  for (const entry of zip.getEntries()) {
    assertProcessingDeadline(startedAt);

    const entryName = getNormalizedEntryName(entry);

    if (!entryName) {
      continue;
    }

    const absoluteEntryPath = resolveExtractedZipPath(targetDirectory, entryName);

    if (entry.isDirectory) {
      fs.mkdirSync(absoluteEntryPath, { recursive: true });
      continue;
    }

    fs.mkdirSync(path.dirname(absoluteEntryPath), { recursive: true });

    try {
      const entryData = entry.getData();
      assertProcessingDeadline(startedAt);
      fs.writeFileSync(absoluteEntryPath, entryData);
    } catch (error) {
      throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
    }
  }
}

export function inspectModelZip(zipFilePath: string): ZipModelInspectionResult {
  const startedAt = Date.now();
  const zip = loadZip(zipFilePath);
  validateZipArchive(zip, startedAt);
  const candidateEntries = getCandidateModelEntries(zip);

  if (candidateEntries.length === 0) {
    return {
      previewModelPath: null,
      candidateEntryName: null,
      sourceFormat: "unknown",
      previewConversionStatus: "not_attempted",
      previewConversionMessage: null,
    };
  }

  if (candidateEntries.length > 1) {
    return {
      previewModelPath: null,
      candidateEntryName: null,
      sourceFormat: "unknown",
      previewConversionStatus: "warning",
      previewConversionMessage: multipleCandidateMessage,
    };
  }

  const [candidateEntry] = candidateEntries;
  const sourceFormat = getSourceFormatForEntry(candidateEntry);

  if (sourceFormat !== "glb") {
    return {
      previewModelPath: null,
      candidateEntryName: getNormalizedEntryName(candidateEntry),
      sourceFormat,
      previewConversionStatus: "not_attempted",
      previewConversionMessage: null,
    };
  }

  return {
    previewModelPath: extractPreviewEntry(candidateEntry, startedAt),
    candidateEntryName: getNormalizedEntryName(candidateEntry),
    sourceFormat,
    previewConversionStatus: "success",
    previewConversionMessage: null,
  };
}
