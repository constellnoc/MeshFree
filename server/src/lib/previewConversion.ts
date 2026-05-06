import { inspectModelZip, type ZipModelInspectionResult } from "./modelPreview";

type PreviewConversionResult = {
  previewModelPath: string | null;
  sourceFormat: ZipModelInspectionResult["sourceFormat"];
  previewConversionStatus: ZipModelInspectionResult["previewConversionStatus"];
  previewConversionMessage: string | null;
  hasMissingTextures: boolean;
};

type ConfiguredSourceFormat = Exclude<ZipModelInspectionResult["sourceFormat"], "unknown">;
type PreviewConversionStrategy = (inspection: ZipModelInspectionResult) => PreviewConversionResult;

function createUnconfiguredConverterMessage(sourceFormat: Exclude<ConfiguredSourceFormat, "glb">) {
  return `Server-side preview conversion for ${sourceFormat.toUpperCase()} files is not configured yet.`;
}

function passthroughGlbPreview(inspection: ZipModelInspectionResult): PreviewConversionResult {
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
  return () => ({
    previewModelPath: null,
    sourceFormat,
    previewConversionStatus: "failed",
    previewConversionMessage: createUnconfiguredConverterMessage(sourceFormat),
    hasMissingTextures: false,
  });
}

const previewConversionStrategies: Record<ConfiguredSourceFormat, PreviewConversionStrategy> = {
  glb: passthroughGlbPreview,
  obj: createPendingConverterStrategy("obj"),
  fbx: createPendingConverterStrategy("fbx"),
  dae: createPendingConverterStrategy("dae"),
  blend: createPendingConverterStrategy("blend"),
};

export function createPreviewConversionResult(zipFilePath: string): PreviewConversionResult {
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

  return previewConversionStrategies[inspection.sourceFormat](inspection);
}

