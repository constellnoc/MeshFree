import crypto from "crypto";
import fs from "fs";
import path from "path";

import AdmZip from "adm-zip";
import type { IZipEntry } from "adm-zip";

import { toRelativeUploadPath, uploadsDir } from "./uploads";

const previewModelsDir = path.join(uploadsDir, "previews");
const multipleCandidateMessage =
  "Detected multiple unrelated candidate model files in the ZIP. Automatic preview selection is not supported yet.";
const supportedSourceFormatsByExtension = {
  ".obj": "obj",
  ".fbx": "fbx",
  ".dae": "dae",
  ".blend": "blend",
  ".glb": "glb",
} as const;

type SupportedSourceExtension = keyof typeof supportedSourceFormatsByExtension;
type SupportedSourceFormat = (typeof supportedSourceFormatsByExtension)[SupportedSourceExtension];

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

function extractPreviewEntry(entry: IZipEntry): string {
  return storePreviewBuffer(entry.getData(), entry.entryName);
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
  const zip = loadZip(zipFilePath);

  for (const entry of zip.getEntries()) {
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
      fs.writeFileSync(absoluteEntryPath, entry.getData());
    } catch (error) {
      throw new InvalidZipArchiveError(error instanceof Error ? error.message : undefined);
    }
  }
}

export function inspectModelZip(zipFilePath: string): ZipModelInspectionResult {
  const zip = loadZip(zipFilePath);
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
    previewModelPath: extractPreviewEntry(candidateEntry),
    candidateEntryName: getNormalizedEntryName(candidateEntry),
    sourceFormat,
    previewConversionStatus: "success",
    previewConversionMessage: null,
  };
}
