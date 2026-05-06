import fs from "fs";
import os from "os";
import path from "path";

import {
  extractZipArchiveToDirectory,
  inspectModelZip,
  storePreviewBuffer,
  type ZipModelInspectionResult,
} from "./modelPreview";

type ObjToGltfConverter = (
  inputFile: string,
  options: {
    binary: true;
  },
) => Promise<Buffer | Uint8Array>;

// obj2gltf is only used for the server-side OBJ -> GLB preview path.
const obj2gltf = require("obj2gltf") as ObjToGltfConverter;

type PreviewConversionResult = {
  previewModelPath: string | null;
  sourceFormat: ZipModelInspectionResult["sourceFormat"];
  previewConversionStatus: ZipModelInspectionResult["previewConversionStatus"];
  previewConversionMessage: string | null;
  hasMissingTextures: boolean;
};

type ConfiguredSourceFormat = Exclude<ZipModelInspectionResult["sourceFormat"], "unknown">;
type PreviewConversionStrategy = (
  zipFilePath: string,
  inspection: ZipModelInspectionResult,
) => Promise<PreviewConversionResult>;

function createUnconfiguredConverterMessage(sourceFormat: Exclude<ConfiguredSourceFormat, "glb">) {
  return `Server-side preview conversion for ${sourceFormat.toUpperCase()} files is not configured yet.`;
}

function resolveExtractedEntryPath(targetDirectory: string, entryName: string) {
  const absoluteEntryPath = path.resolve(targetDirectory, entryName);
  const relativePath = path.relative(targetDirectory, absoluteEntryPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Extracted entry path must stay inside the temporary directory.");
  }

  return absoluteEntryPath;
}

function formatConversionErrorMessage(sourceFormat: Exclude<ConfiguredSourceFormat, "glb">, error: unknown) {
  const fallbackMessage = `Server-side preview conversion for ${sourceFormat.toUpperCase()} files failed.`;

  if (!(error instanceof Error) || !error.message.trim()) {
    return fallbackMessage;
  }

  return `${fallbackMessage} ${error.message.trim()}`;
}

async function passthroughGlbPreview(
  _zipFilePath: string,
  inspection: ZipModelInspectionResult,
): Promise<PreviewConversionResult> {
  if (!inspection.previewModelPath) {
    return {
      previewModelPath: null,
      sourceFormat: inspection.sourceFormat,
      previewConversionStatus: "failed",
      previewConversionMessage: "GLB preview extraction failed unexpectedly.",
      hasMissingTextures: false,
    };
  }

  return {
    previewModelPath: inspection.previewModelPath,
    sourceFormat: inspection.sourceFormat,
    previewConversionStatus: "success",
    previewConversionMessage: null,
    hasMissingTextures: false,
  };
}

function createPendingConverterStrategy(
  sourceFormat: Exclude<ConfiguredSourceFormat, "glb">,
): PreviewConversionStrategy {
  return async () => ({
    previewModelPath: null,
    sourceFormat,
    previewConversionStatus: "failed",
    previewConversionMessage: createUnconfiguredConverterMessage(sourceFormat),
    hasMissingTextures: false,
  });
}

async function convertObjPreview(
  zipFilePath: string,
  inspection: ZipModelInspectionResult,
): Promise<PreviewConversionResult> {
  if (!inspection.candidateEntryName) {
    return {
      previewModelPath: null,
      sourceFormat: "obj",
      previewConversionStatus: "failed",
      previewConversionMessage: "OBJ conversion could not locate the source model file.",
      hasMissingTextures: false,
    };
  }

  const extractionDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "meshfree-preview-"));

  try {
    extractZipArchiveToDirectory(zipFilePath, extractionDirectory);

    const absoluteObjPath = resolveExtractedEntryPath(extractionDirectory, inspection.candidateEntryName);

    if (!fs.existsSync(absoluteObjPath)) {
      return {
        previewModelPath: null,
        sourceFormat: "obj",
        previewConversionStatus: "failed",
        previewConversionMessage: "OBJ conversion could not find the extracted source file.",
        hasMissingTextures: false,
      };
    }

    const glbOutput = await obj2gltf(absoluteObjPath, { binary: true });
    const glbBuffer = Buffer.isBuffer(glbOutput) ? glbOutput : Buffer.from(glbOutput);

    return {
      previewModelPath: storePreviewBuffer(glbBuffer, `${inspection.candidateEntryName}.glb`),
      sourceFormat: "obj",
      previewConversionStatus: "success",
      previewConversionMessage: null,
      hasMissingTextures: false,
    };
  } catch (error) {
    return {
      previewModelPath: null,
      sourceFormat: "obj",
      previewConversionStatus: "failed",
      previewConversionMessage: formatConversionErrorMessage("obj", error),
      hasMissingTextures: false,
    };
  } finally {
    fs.rmSync(extractionDirectory, { recursive: true, force: true });
  }
}

const previewConversionStrategies: Record<ConfiguredSourceFormat, PreviewConversionStrategy> = {
  glb: passthroughGlbPreview,
  obj: convertObjPreview,
  fbx: createPendingConverterStrategy("fbx"),
  dae: createPendingConverterStrategy("dae"),
  blend: createPendingConverterStrategy("blend"),
};

export async function createPreviewConversionResult(zipFilePath: string): Promise<PreviewConversionResult> {
  const inspection = inspectModelZip(zipFilePath);

  if (inspection.sourceFormat === "unknown") {
    return {
      previewModelPath: inspection.previewModelPath,
      sourceFormat: inspection.sourceFormat,
      previewConversionStatus: inspection.previewConversionStatus,
      previewConversionMessage: inspection.previewConversionMessage,
      hasMissingTextures: false,
    };
  }

  return previewConversionStrategies[inspection.sourceFormat](zipFilePath, inspection);
}

