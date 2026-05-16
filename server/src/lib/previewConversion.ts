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
  alphaMaterialCount: number;
  doubleSidedMaterialCount: number;
  imageCount: number;
  materialCount: number;
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
    alphaMaterialCount: 0,
    doubleSidedMaterialCount: 0,
    imageCount: 0,
    materialCount: 0,
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
        alphaMode?: string;
        doubleSided?: boolean;
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
      alphaMaterialCount: (gltf.materials ?? []).filter((material) => material.alphaMode === "BLEND" || material.alphaMode === "MASK").length,
      doubleSidedMaterialCount: (gltf.materials ?? []).filter((material) => material.doubleSided).length,
      imageCount: gltf.images?.length ?? 0,
      materialCount: gltf.materials?.length ?? 0,
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
  return (
    inspection.materialTextureCount * 3 +
    inspection.textureCount * 2 +
    inspection.imageCount +
    inspection.alphaMaterialCount +
    inspection.doubleSidedMaterialCount
  );
}

function formatGlbInspection(inspection: GlbInspection) {
  return `${inspection.imageCount} image(s), ${inspection.textureCount} texture(s), ${inspection.materialTextureCount} material texture reference(s), ${inspection.alphaMaterialCount} alpha material(s), ${inspection.doubleSidedMaterialCount} double-sided material(s)`;
}

function formatAttemptError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  return message ? message.slice(0, 2000) : "unknown error";
}

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const BLENDER_CONVERSION_TIMEOUT_MS = Number.parseInt(process.env.PREVIEW_BLENDER_TIMEOUT_MS ?? "", 10) || DEFAULT_COMMAND_TIMEOUT_MS;

function runCommand(command: string, args: string[], workingDirectory: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workingDirectory,
      windowsHide: true,
    });
    let output = "";
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} exceeded ${timeoutMs}ms and was terminated. ${output.trim().slice(-1000)}`));
    }, timeoutMs);

    function settle(callback: () => void) {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeout);
      callback();
    }

    child.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      output += data.toString();
    });
    child.on("error", (error) => {
      settle(() => reject(error));
    });
    child.on("close", (code) => {
      settle(() => {
        if (code === 0) {
          resolve(output);
          return;
        }

        reject(new Error(output.trim() || `${command} exited with status ${code}.`));
      });
    });
  });
}

type BlenderConversionResult = {
  diagnostics: string;
  outputPath: string;
};

function extractBlenderDiagnostics(output: string) {
  const diagnostics = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("meshfree_"))
    .join("; ");

  return diagnostics.length > 1800 ? `${diagnostics.slice(0, 1800)}...` : diagnostics;
}

function shouldTryBlenderFallback(bestConversion: { inspection: GlbInspection } | null) {
  if (!bestConversion) {
    return true;
  }

  // FBX2glTF can produce geometry with only partial or wrong material links.
  // Let Blender compete when the material signal is still very weak.
  return bestConversion.inspection.imageCount <= 1 || bestConversion.inspection.materialTextureCount <= 1;
}

async function convertFbxWithBlender(absoluteFbxPath: string, outputGlbPath: string, workingDirectory: string): Promise<BlenderConversionResult> {
  const blenderBinary = process.env.BLENDER_BINARY || process.env.BLENDER_PATH || "blender";
  const scriptPath = path.join(workingDirectory, "meshfree-blender-fbx-to-glb.py");
  const script = `
import bpy
import os
import re
import sys

args = sys.argv[sys.argv.index("--") + 1:]
input_path = args[0]
output_path = args[1]
search_root = args[2]
texture_extensions = {".bmp", ".jpeg", ".jpg", ".png", ".tga", ".tif", ".tiff", ".webp"}
generated_texture_dir = os.path.dirname(output_path)
combined_texture_cache = {}

role_keywords = {
    "baseColor": ["basecolor", "base", "bc", "diffuse", "diff", "albedo", "color", "colour", "col"],
    "alpha": ["opacity", "alpha", "transparency", "transparent", "mask", "cutout"],
    "normal": ["normal", "norm", "nrm", "bump"],
    "roughness": ["roughness", "rough", "rgh"],
    "metallic": ["metallic", "metalness", "metal", "mtl"],
}

thin_surface_keywords = ["alpha", "card", "cutout", "fur", "hair", "leaf", "plane", "shell", "transparent"]

def compact(value):
    return re.sub(r"[^a-z0-9]+", "", value.lower())

def tokenize(value):
    name = os.path.splitext(os.path.basename(value or ""))[0].lower()
    return [token for token in re.split(r"[^a-z0-9]+", name) if token]

def has_keyword(value, keywords):
    value_tokens = set(tokenize(value))
    compacted = compact(value)
    return any(keyword in value_tokens or keyword in compacted for keyword in keywords)

def find_texture_images(root):
    images = []
    for current_root, _dirs, files in os.walk(root):
        for name in files:
            if os.path.splitext(name)[1].lower() in texture_extensions:
                images.append(os.path.join(current_root, name))
    return sorted(images, key=lambda value: value.lower())

def describe_texture(path):
    roles = [role for role, keywords in role_keywords.items() if has_keyword(path, keywords)]
    return {
        "path": path,
        "name": os.path.basename(path),
        "tokens": set(tokenize(path)),
        "roles": roles,
    }

def collect_material_usage_tokens():
    usage = {}
    for material in bpy.data.materials:
        usage[material.name] = set(tokenize(material.name))

    for obj in bpy.context.scene.objects:
        data = getattr(obj, "data", None)
        materials = getattr(data, "materials", None)
        if materials is None:
            continue

        object_tokens = set(tokenize(obj.name))
        for material in materials:
            if material:
                usage.setdefault(material.name, set()).update(object_tokens)

    return usage

def ensure_principled_bsdf(material):
    material.use_nodes = True
    nodes = material.node_tree.nodes
    for node in nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return nodes.new(type="ShaderNodeBsdfPrincipled")

def clear_socket_links(material, socket):
    for link in list(material.node_tree.links):
        if link.to_socket == socket:
            material.node_tree.links.remove(link)

def load_image(image_path, color_space):
    if not image_path:
        return None

    image = bpy.data.images.load(image_path, check_existing=True)
    try:
        image.colorspace_settings.name = color_space
    except Exception:
        pass

    return image

def link_image_to_socket(material, image_path, socket_name, output_name, color_space):
    image = load_image(image_path, color_space)
    if image is None:
        return False

    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = ensure_principled_bsdf(material)
    socket = principled.inputs.get(socket_name)

    if socket is None:
        return False

    clear_socket_links(material, socket)
    image_node = nodes.new(type="ShaderNodeTexImage")
    image_node.image = image
    links.new(image_node.outputs[output_name], socket)
    return True

def link_normal_texture(material, image_path):
    image = load_image(image_path, "Non-Color")
    if image is None:
        return False

    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = ensure_principled_bsdf(material)
    socket = principled.inputs.get("Normal")

    if socket is None:
        return False

    clear_socket_links(material, socket)
    image_node = nodes.new(type="ShaderNodeTexImage")
    image_node.image = image
    normal_node = nodes.new(type="ShaderNodeNormalMap")
    links.new(image_node.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], socket)
    return True

def create_base_alpha_texture(base_color_path, alpha_path):
    if not base_color_path or not alpha_path:
        return base_color_path

    cache_key = base_color_path + "|" + alpha_path
    if cache_key in combined_texture_cache:
        return combined_texture_cache[cache_key]

    base_image = load_image(base_color_path, "sRGB")
    alpha_image = load_image(alpha_path, "Non-Color")

    if base_image is None or alpha_image is None:
        return base_color_path

    if base_image.size[0] != alpha_image.size[0] or base_image.size[1] != alpha_image.size[1]:
        return base_color_path

    pixel_count = base_image.size[0] * base_image.size[1]
    if pixel_count > 16777216:
        print("meshfree_alpha_composite_skipped: image too large " + os.path.basename(base_color_path))
        return base_color_path

    width = base_image.size[0]
    height = base_image.size[1]
    output_name = "meshfree_" + os.path.splitext(os.path.basename(base_color_path))[0] + "_alpha.png"
    output_path = os.path.join(generated_texture_dir, output_name)

    if os.path.exists(output_path):
        combined_texture_cache[cache_key] = output_path
        return output_path

    combined = bpy.data.images.new(
        "meshfree_" + os.path.splitext(os.path.basename(base_color_path))[0] + "_alpha",
        width=width,
        height=height,
        alpha=True,
    )
    base_pixels = list(base_image.pixels[:])
    alpha_pixels = list(alpha_image.pixels[:])
    combined_pixels = [0.0] * (width * height * 4)

    for index in range(width * height):
        base_offset = index * 4
        combined_pixels[base_offset] = base_pixels[base_offset]
        combined_pixels[base_offset + 1] = base_pixels[base_offset + 1]
        combined_pixels[base_offset + 2] = base_pixels[base_offset + 2]
        combined_pixels[base_offset + 3] = alpha_pixels[base_offset]

    combined.pixels.foreach_set(combined_pixels)
    combined.filepath_raw = output_path
    combined.file_format = "PNG"
    combined.save()
    combined_texture_cache[cache_key] = output_path
    return output_path

def choose_texture(texture_records, material_identifiers, role):
    role_records = [record for record in texture_records if role in record["roles"]]

    if not role_records:
        if role == "baseColor" and len(texture_records) == 1:
            return texture_records[0]["path"]
        return None

    best_record = None
    best_score = -1

    for record in role_records:
        token_overlap = len(record["tokens"].intersection(material_identifiers))
        score = 20 + token_overlap * 5

        if score > best_score:
            best_record = record
            best_score = score

    if best_record is None:
        return None

    return best_record["path"]

def make_material_double_sided(material):
    material.use_backface_culling = False
    if hasattr(material, "show_transparent_back"):
        material.show_transparent_back = True

def should_force_double_sided(material, identifiers, linked_roles):
    if any(role.startswith("alpha=") for role in linked_roles):
        return True

    joined = material.name + " " + " ".join(sorted(identifiers))
    return has_keyword(joined, thin_surface_keywords)

def attach_fallback_textures(texture_paths):
    texture_records = [describe_texture(path) for path in texture_paths]
    material_usage_tokens = collect_material_usage_tokens()
    linked_count = 0
    material_logs = []

    for material in bpy.data.materials:
        identifiers = material_usage_tokens.get(material.name, set()).union(set(tokenize(material.name)))
        linked_roles = []
        base_color_path = choose_texture(texture_records, identifiers, "baseColor")
        alpha_path = choose_texture(texture_records, identifiers, "alpha")
        alpha_socket_path = alpha_path
        alpha_output_name = "Color"
        alpha_color_space = "Non-Color"

        if base_color_path and alpha_path:
            combined_base_color_path = create_base_alpha_texture(base_color_path, alpha_path)
            if combined_base_color_path != base_color_path:
                base_color_path = combined_base_color_path
                alpha_socket_path = combined_base_color_path
                alpha_output_name = "Alpha"
                alpha_color_space = "sRGB"

        if link_image_to_socket(material, base_color_path, "Base Color", "Color", "sRGB"):
            linked_count += 1
            linked_roles.append("baseColor=" + os.path.basename(base_color_path))

        if alpha_path and link_image_to_socket(material, alpha_socket_path, "Alpha", alpha_output_name, alpha_color_space):
            material.blend_method = "BLEND"
            material.alpha_threshold = 0.08
            linked_count += 1
            linked_roles.append("alpha=" + os.path.basename(alpha_path))

        normal_path = choose_texture(texture_records, identifiers, "normal")
        if link_normal_texture(material, normal_path):
            linked_count += 1
            linked_roles.append("normal=" + os.path.basename(normal_path))

        roughness_path = choose_texture(texture_records, identifiers, "roughness")
        if link_image_to_socket(material, roughness_path, "Roughness", "Color", "Non-Color"):
            linked_count += 1
            linked_roles.append("roughness=" + os.path.basename(roughness_path))

        metallic_path = choose_texture(texture_records, identifiers, "metallic")
        if link_image_to_socket(material, metallic_path, "Metallic", "Color", "Non-Color"):
            linked_count += 1
            linked_roles.append("metallic=" + os.path.basename(metallic_path))

        if should_force_double_sided(material, identifiers, linked_roles):
            make_material_double_sided(material)
            linked_roles.append("doubleSided")

        if linked_roles:
            material_logs.append(material.name + "[" + ", ".join(linked_roles) + "]")

    return linked_count, material_logs

def print_limited(label, value, limit=1600):
    text = str(value)
    if len(text) > limit:
        text = text[:limit] + "..."
    print(label + ":", text)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
bpy.ops.import_scene.fbx(filepath=input_path)

if len(bpy.context.scene.objects) == 0:
    raise RuntimeError("Blender imported the FBX but found no scene objects.")

texture_paths = find_texture_images(search_root)
linked_texture_count, material_logs = attach_fallback_textures(texture_paths)
print("meshfree_texture_file_count:", len(texture_paths))
print_limited("meshfree_texture_files", ", ".join(os.path.relpath(path, search_root) for path in texture_paths))
print("meshfree_linked_texture_count:", linked_texture_count)
print_limited("meshfree_material_links", "; ".join(material_logs))

bpy.ops.export_scene.gltf(filepath=output_path, export_format="GLB")
`;

  fs.writeFileSync(scriptPath, script, "utf8");
  const output = await runCommand(
    blenderBinary,
    ["--background", "--python", scriptPath, "--", absoluteFbxPath, outputGlbPath, workingDirectory],
    workingDirectory,
    BLENDER_CONVERSION_TIMEOUT_MS,
  );

  if (!fs.existsSync(outputGlbPath)) {
    throw new Error(`Blender did not create the GLB output. ${output.trim().slice(-1000)}`);
  }

  return {
    diagnostics: extractBlenderDiagnostics(output),
    outputPath: outputGlbPath,
  };
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
        conversionSummaries.push(`${attempt.description}: ${formatGlbInspection(glbInspection)}`);

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

    if (shouldTryBlenderFallback(bestConversion)) {
      const blenderOutputGlbPath = path.join(extractionDirectory, `${outputBaseName}-blender.glb`);

      try {
        const blenderConversion = await convertFbxWithBlender(absoluteFbxPath, blenderOutputGlbPath, extractionDirectory);
        const glbBuffer = fs.readFileSync(blenderConversion.outputPath);
        const glbInspection = inspectGlbBuffer(glbBuffer);
        const score = scoreGlbInspection(glbInspection);

        conversionSummaries.push(
          `Blender fallback: ${formatGlbInspection(glbInspection)}${
            blenderConversion.diagnostics ? `. Diagnostics: ${blenderConversion.diagnostics}` : ""
          }`,
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
      previewConversionMessage: `Converted FBX preview to GLB with ${bestConversion.attemptDescription}. Selected result detected ${formatGlbInspection(bestConversion.inspection)}. Attempts: ${conversionSummaries.join("; ")}.`,
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

