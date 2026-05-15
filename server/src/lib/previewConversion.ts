import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

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
type FbxToGltfConverter = (inputFile: string, outputFile: string, options?: string[]) => Promise<string>;

// obj2gltf is only used for the server-side OBJ -> GLB preview path.
const obj2gltf = require("obj2gltf") as ObjToGltfConverter;
const fbx2gltf = require("fbx2gltf") as FbxToGltfConverter;
const createGltf = require("obj2gltf/lib/createGltf") as (objData: unknown, options: Record<string, unknown>) => unknown;
const loadObj = require("obj2gltf/lib/loadObj") as (
  objPath: string,
  options: Record<string, unknown>,
) => Promise<unknown>;
const writeGltf = require("obj2gltf/lib/writeGltf") as (
  gltf: Record<string, unknown>,
  options: Record<string, unknown>,
) => Promise<Buffer | Record<string, unknown>>;
const fbxConversionAttempts = [
  {
    description: "PBR material extraction",
    fileSuffix: "pbr",
    options: ["--pbr-metallic-roughness"],
  },
  {
    description: "unlit material extraction",
    fileSuffix: "unlit",
    options: ["--khr-materials-unlit"],
  },
] as const;

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

type ObjMaterialInfo = {
  ambientColor: [number, number, number] | null;
  diffuseColor: [number, number, number] | null;
  hasDiffuseTexture: boolean;
};

type ObjMaterialFaceStats = {
  faces: number;
  vertexIndices: Set<number>;
};

type BoundingBox = {
  maxX: number;
  maxY: number;
  maxZ: number;
  minX: number;
  minY: number;
  minZ: number;
};

type ObjGltfMaterial = {
  extensions?: {
    KHR_materials_pbrSpecularGlossiness?: Record<string, unknown>;
  };
  name?: string;
  occlusionTexture?: {
    index: number;
  };
};

type GlbInspection = {
  imageCount: number;
  materialTextureCount: number;
  textureCount: number;
};

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

function inspectGlbBuffer(glbBuffer: Buffer): GlbInspection {
  const emptyInspection = {
    imageCount: 0,
    materialTextureCount: 0,
    textureCount: 0,
  };

  if (glbBuffer.length < 20 || glbBuffer.toString("utf8", 0, 4) !== "glTF") {
    return emptyInspection;
  }

  const jsonChunkLength = glbBuffer.readUInt32LE(12);
  const jsonChunkType = glbBuffer.toString("utf8", 16, 20);

  if (jsonChunkType !== "JSON" || glbBuffer.length < 20 + jsonChunkLength) {
    return emptyInspection;
  }

  try {
    const gltf = JSON.parse(glbBuffer.toString("utf8", 20, 20 + jsonChunkLength).trim()) as {
      images?: unknown[];
      materials?: Array<{
        emissiveTexture?: unknown;
        normalTexture?: unknown;
        occlusionTexture?: unknown;
        pbrMetallicRoughness?: {
          baseColorTexture?: unknown;
          metallicRoughnessTexture?: unknown;
        };
      }>;
      textures?: unknown[];
    };

    return {
      imageCount: gltf.images?.length ?? 0,
      materialTextureCount: (gltf.materials ?? []).reduce((count, material) => {
        const pbrTextureCount =
          (material.pbrMetallicRoughness?.baseColorTexture ? 1 : 0) +
          (material.pbrMetallicRoughness?.metallicRoughnessTexture ? 1 : 0);

        return (
          count +
          pbrTextureCount +
          (material.normalTexture ? 1 : 0) +
          (material.occlusionTexture ? 1 : 0) +
          (material.emissiveTexture ? 1 : 0)
        );
      }, 0),
      textureCount: gltf.textures?.length ?? 0,
    };
  } catch {
    return emptyInspection;
  }
}

function scoreGlbInspection(inspection: GlbInspection) {
  return inspection.materialTextureCount * 3 + inspection.textureCount * 2 + inspection.imageCount;
}

function formatAttemptError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  return message ? message.slice(0, 240) : "unknown error";
}

function runCommand(command: string, args: string[], workingDirectory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workingDirectory,
      windowsHide: true,
    });
    let output = "";

    child.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      output += data.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
        return;
      }

      reject(new Error(output.trim() || `${command} exited with status ${code}.`));
    });
  });
}

async function convertFbxWithBlender(absoluteFbxPath: string, outputGlbPath: string, workingDirectory: string) {
  const blenderBinary = process.env.BLENDER_BINARY || process.env.BLENDER_PATH || "blender";
  const scriptPath = path.join(workingDirectory, "meshfree-blender-fbx-to-glb.py");
  const script = `
import bpy
import sys

args = sys.argv[sys.argv.index("--") + 1:]
input_path = args[0]
output_path = args[1]

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.fbx(filepath=input_path)

if len(bpy.context.scene.objects) == 0:
    raise RuntimeError("Blender imported the FBX but found no scene objects.")

bpy.ops.export_scene.gltf(filepath=output_path, export_format="GLB", export_image_format="AUTO")
`;

  fs.writeFileSync(scriptPath, script, "utf8");
  const output = await runCommand(blenderBinary, ["--background", "--python", scriptPath, "--", absoluteFbxPath, outputGlbPath], workingDirectory);

  if (!fs.existsSync(outputGlbPath)) {
    throw new Error(`Blender did not create the GLB output. ${output.trim().slice(-1000)}`);
  }

  return outputGlbPath;
}

function createEmptyBoundingBox(): BoundingBox {
  return {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
  };
}

function updateBoundingBox(bounds: BoundingBox, x: number, y: number, z: number) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.minZ = Math.min(bounds.minZ, z);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.maxZ = Math.max(bounds.maxZ, z);
}

function getBoundingBoxSpans(bounds: BoundingBox) {
  return {
    x: bounds.maxX - bounds.minX,
    y: bounds.maxY - bounds.minY,
    z: bounds.maxZ - bounds.minZ,
  };
}

function parseObjColorTriplet(line: string): [number, number, number] | null {
  const parts = line.trim().split(/\s+/);

  if (parts.length < 4) {
    return null;
  }

  const color = parts.slice(1, 4).map((value) => Number.parseFloat(value));

  if (color.some((value) => Number.isNaN(value))) {
    return null;
  }

  return [color[0], color[1], color[2]];
}

function isNearlyBlack(color: [number, number, number] | null) {
  if (!color) {
    return false;
  }

  return color.every((channel) => channel <= 0.02);
}

function parseObjMaterialLibrary(materialLibraryPath: string) {
  const contents = fs.readFileSync(materialLibraryPath, "utf8");
  const materials = new Map<string, ObjMaterialInfo>();
  let currentMaterialName: string | null = null;

  for (const line of contents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    if (trimmedLine.startsWith("newmtl ")) {
      currentMaterialName = trimmedLine.slice("newmtl ".length).trim();

      if (currentMaterialName) {
        materials.set(currentMaterialName, {
          ambientColor: null,
          diffuseColor: null,
          hasDiffuseTexture: false,
        });
      }

      continue;
    }

    if (!currentMaterialName) {
      continue;
    }

    const material = materials.get(currentMaterialName);

    if (!material) {
      continue;
    }

    if (trimmedLine.startsWith("Kd ")) {
      material.diffuseColor = parseObjColorTriplet(trimmedLine);
      continue;
    }

    if (trimmedLine.startsWith("Ka ")) {
      material.ambientColor = parseObjColorTriplet(trimmedLine);
      continue;
    }

    if (trimmedLine.startsWith("map_Kd ")) {
      material.hasDiffuseTexture = true;
    }
  }

  return materials;
}

function resolveObjIndex(vertexIndexToken: string, vertexCount: number) {
  const rawIndex = Number.parseInt(vertexIndexToken, 10);

  if (Number.isNaN(rawIndex)) {
    return null;
  }

  if (rawIndex > 0) {
    return rawIndex;
  }

  if (rawIndex < 0) {
    return vertexCount + rawIndex;
  }

  return null;
}

function isLikelyGroundShadowPlane(
  materialName: string,
  stats: ObjMaterialFaceStats,
  vertices: Array<[number, number, number]>,
  materialInfo: ObjMaterialInfo | undefined,
) {
  if (!/(ground|shadow)/i.test(materialName)) {
    return false;
  }

  if (!materialInfo || materialInfo.hasDiffuseTexture) {
    return false;
  }

  if (!isNearlyBlack(materialInfo.diffuseColor) || !isNearlyBlack(materialInfo.ambientColor)) {
    return false;
  }

  if (stats.faces > 2 || stats.vertexIndices.size < 3 || stats.vertexIndices.size > 8) {
    return false;
  }

  const bounds = createEmptyBoundingBox();

  for (const vertexIndex of stats.vertexIndices) {
    const vertex = vertices[vertexIndex];

    if (!vertex) {
      return false;
    }

    updateBoundingBox(bounds, vertex[0], vertex[1], vertex[2]);
  }

  const spans = getBoundingBoxSpans(bounds);
  const maxHorizontalSpan = Math.max(spans.x, spans.z);

  if (maxHorizontalSpan <= 0) {
    return false;
  }

  return spans.y <= Math.max(maxHorizontalSpan * 0.001, 0.001);
}

function sanitizeObjShadowPlanes(objPath: string) {
  const objContents = fs.readFileSync(objPath, "utf8");
  const objLines = objContents.split(/\r?\n/);
  const materialLibraries = objLines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("mtllib "))
    .map((line) => line.slice("mtllib ".length).trim())
    .filter(Boolean);
  const materials = new Map<string, ObjMaterialInfo>();

  for (const materialLibrary of materialLibraries) {
    const materialLibraryPath = path.resolve(path.dirname(objPath), materialLibrary);

    if (!fs.existsSync(materialLibraryPath)) {
      continue;
    }

    for (const [name, materialInfo] of parseObjMaterialLibrary(materialLibraryPath)) {
      materials.set(name, materialInfo);
    }
  }

  const vertices: Array<[number, number, number]> = [[0, 0, 0]];
  const materialFaceStats = new Map<string, ObjMaterialFaceStats>();
  let currentMaterialName: string | null = null;

  for (const line of objLines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    if (trimmedLine.startsWith("v ")) {
      const parts = trimmedLine.split(/\s+/);

      if (parts.length >= 4) {
        const x = Number.parseFloat(parts[1]);
        const y = Number.parseFloat(parts[2]);
        const z = Number.parseFloat(parts[3]);

        if (![x, y, z].some((value) => Number.isNaN(value))) {
          vertices.push([x, y, z]);
        }
      }

      continue;
    }

    if (trimmedLine.startsWith("usemtl ")) {
      currentMaterialName = trimmedLine.slice("usemtl ".length).trim() || null;
      continue;
    }

    if (!trimmedLine.startsWith("f ") || !currentMaterialName) {
      continue;
    }

    const stats = materialFaceStats.get(currentMaterialName) ?? {
      faces: 0,
      vertexIndices: new Set<number>(),
    };

    stats.faces += 1;

    for (const token of trimmedLine.split(/\s+/).slice(1)) {
      const vertexIndex = resolveObjIndex(token.split("/")[0], vertices.length);

      if (vertexIndex && vertexIndex > 0) {
        stats.vertexIndices.add(vertexIndex);
      }
    }

    materialFaceStats.set(currentMaterialName, stats);
  }

  const droppedMaterialNames = Array.from(materialFaceStats.entries())
    .filter(([materialName, stats]) => isLikelyGroundShadowPlane(materialName, stats, vertices, materials.get(materialName)))
    .map(([materialName]) => materialName);

  if (droppedMaterialNames.length === 0) {
    return {
      droppedMaterialNames,
      sanitizedObjPath: objPath,
    };
  }

  const droppedMaterials = new Set(droppedMaterialNames);
  const sanitizedLines: string[] = [];
  currentMaterialName = null;

  for (const line of objLines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("usemtl ")) {
      currentMaterialName = trimmedLine.slice("usemtl ".length).trim() || null;
      sanitizedLines.push(line);
      continue;
    }

    if (trimmedLine.startsWith("f ") && currentMaterialName && droppedMaterials.has(currentMaterialName)) {
      continue;
    }

    sanitizedLines.push(line);
  }

  fs.writeFileSync(objPath, sanitizedLines.join("\n"), "utf8");

  return {
    droppedMaterialNames,
    sanitizedObjPath: objPath,
  };
}

function createObjSpecGlossOptions() {
  return {
    binary: true,
    checkTransparency: false,
    doubleSidedMaterial: false,
    inputUpAxis: "Y",
    logger: () => undefined,
    metallicRoughness: false,
    outputUpAxis: "Y",
    overridingTextures: {},
    packOcclusion: false,
    secure: true,
    separate: false,
    separateTextures: false,
    specularGlossiness: true,
    triangleWindingOrderSanitization: false,
    unlit: false,
  };
}

async function convertObjWithSpecGloss(objPath: string) {
  const conversionOptions = createObjSpecGlossOptions();
  const objData = await loadObj(objPath, conversionOptions);
  const gltf = createGltf(objData, conversionOptions) as {
    materials?: ObjGltfMaterial[];
  };

  for (const material of gltf.materials ?? []) {
    if (!material.extensions?.KHR_materials_pbrSpecularGlossiness) {
      continue;
    }

    // Legacy OBJ exports often misuse map_Ka as an illumination map.
    // obj2gltf can interpret that as occlusion, which makes stylized
    // vehicles look much darker than the source asset.
    delete material.occlusionTexture;
  }

  const glbOutput = await writeGltf(gltf as unknown as Record<string, unknown>, conversionOptions);

  return Buffer.isBuffer(glbOutput) ? glbOutput : Buffer.from(JSON.stringify(glbOutput));
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

    const { droppedMaterialNames, sanitizedObjPath } = sanitizeObjShadowPlanes(absoluteObjPath);
    const glbBuffer = await convertObjWithSpecGloss(sanitizedObjPath);

    return {
      previewModelPath: storePreviewBuffer(glbBuffer, `${inspection.candidateEntryName}.glb`),
      sourceFormat: "obj",
      previewConversionStatus: "success",
      previewConversionMessage:
        droppedMaterialNames.length > 0
          ? `Filtered likely ground/shadow materials from OBJ preview: ${droppedMaterialNames.join(", ")}.`
          : "Converted OBJ preview with spec/gloss material preservation.",
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

async function convertFbxPreview(
  zipFilePath: string,
  inspection: ZipModelInspectionResult,
): Promise<PreviewConversionResult> {
  if (!inspection.candidateEntryName) {
    return {
      previewModelPath: null,
      sourceFormat: "fbx",
      previewConversionStatus: "failed",
      previewConversionMessage: "FBX conversion could not locate the source model file.",
      hasMissingTextures: false,
    };
  }

  const extractionDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "meshfree-preview-"));

  try {
    extractZipArchiveToDirectory(zipFilePath, extractionDirectory);

    const absoluteFbxPath = resolveExtractedEntryPath(extractionDirectory, inspection.candidateEntryName);

    if (!fs.existsSync(absoluteFbxPath)) {
      return {
        previewModelPath: null,
        sourceFormat: "fbx",
        previewConversionStatus: "failed",
        previewConversionMessage: "FBX conversion could not find the extracted source file.",
        hasMissingTextures: false,
      };
    }

    const outputBaseName = path.basename(inspection.candidateEntryName, path.extname(inspection.candidateEntryName));
    const conversionSummaries: string[] = [];
    let bestConversion:
      | {
          attemptDescription: string;
          glbBuffer: Buffer;
          inspection: GlbInspection;
          score: number;
        }
      | null = null;
    let lastConversionError: unknown = null;

    for (const attempt of fbxConversionAttempts) {
      const outputGlbPath = path.join(extractionDirectory, `${outputBaseName}-${attempt.fileSuffix}.glb`);

      try {
        const convertedGlbPath = await fbx2gltf(absoluteFbxPath, outputGlbPath, [...attempt.options]);
        const glbBuffer = fs.readFileSync(convertedGlbPath);
        const glbInspection = inspectGlbBuffer(glbBuffer);
        const score = scoreGlbInspection(glbInspection);
        conversionSummaries.push(
          `${attempt.description}: ${glbInspection.imageCount} image(s), ${glbInspection.textureCount} texture(s), ${glbInspection.materialTextureCount} material texture reference(s)`,
        );

        if (!bestConversion || score > bestConversion.score) {
          bestConversion = {
            attemptDescription: attempt.description,
            glbBuffer,
            inspection: glbInspection,
            score,
          };
        }
      } catch (error) {
        lastConversionError = error;
        conversionSummaries.push(`${attempt.description}: failed (${formatAttemptError(error)})`);
      }
    }

    if (!bestConversion || bestConversion.score === 0) {
      const blenderOutputGlbPath = path.join(extractionDirectory, `${outputBaseName}-blender.glb`);

      try {
        const convertedGlbPath = await convertFbxWithBlender(absoluteFbxPath, blenderOutputGlbPath, extractionDirectory);
        const glbBuffer = fs.readFileSync(convertedGlbPath);
        const glbInspection = inspectGlbBuffer(glbBuffer);
        const score = scoreGlbInspection(glbInspection);

        conversionSummaries.push(
          `Blender fallback: ${glbInspection.imageCount} image(s), ${glbInspection.textureCount} texture(s), ${glbInspection.materialTextureCount} material texture reference(s)`,
        );

        if (!bestConversion || score > bestConversion.score) {
          bestConversion = {
            attemptDescription: "Blender fallback",
            glbBuffer,
            inspection: glbInspection,
            score,
          };
        }
      } catch (error) {
        lastConversionError = error;
        conversionSummaries.push(`Blender fallback: failed (${formatAttemptError(error)})`);
      }
    }

    if (!bestConversion) {
      throw lastConversionError instanceof Error ? lastConversionError : new Error("FBX conversion did not produce a GLB preview.");
    }

    return {
      previewModelPath: storePreviewBuffer(bestConversion.glbBuffer, `${inspection.candidateEntryName}.glb`),
      sourceFormat: "fbx",
      previewConversionStatus: "success",
      previewConversionMessage: `Converted FBX preview to GLB with ${bestConversion.attemptDescription}. Selected result detected ${bestConversion.inspection.imageCount} image(s), ${bestConversion.inspection.textureCount} texture(s), and ${bestConversion.inspection.materialTextureCount} material texture reference(s). Attempts: ${conversionSummaries.join("; ")}.`,
      hasMissingTextures: false,
    };
  } catch (error) {
    return {
      previewModelPath: null,
      sourceFormat: "fbx",
      previewConversionStatus: "failed",
      previewConversionMessage: formatConversionErrorMessage("fbx", error),
      hasMissingTextures: false,
    };
  } finally {
    fs.rmSync(extractionDirectory, { recursive: true, force: true });
  }
}

const previewConversionStrategies: Record<ConfiguredSourceFormat, PreviewConversionStrategy> = {
  glb: passthroughGlbPreview,
  obj: convertObjPreview,
  fbx: convertFbxPreview,
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

