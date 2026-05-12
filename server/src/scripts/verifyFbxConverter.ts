import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function resolveFbx2GltfBinaryPath(): string {
  const packageDirectory = path.dirname(require.resolve("fbx2gltf"));
  const binaryFileName = os.type() === "Windows_NT" ? "FBX2glTF.exe" : "FBX2glTF";

  return path.join(packageDirectory, "bin", os.type(), binaryFileName);
}

function verifyFbxConverter(): void {
  const binaryPath = resolveFbx2GltfBinaryPath();

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`FBX2glTF binary was not found: ${binaryPath}`);
  }

  const result = spawnSync(binaryPath, ["--help"], {
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`FBX2glTF exited with status ${result.status}: ${result.stderr || result.stdout}`);
  }

  if (!result.stdout.includes("FBX2glTF")) {
    throw new Error("FBX2glTF help output was not recognized.");
  }

  console.log(`FBX2glTF verification passed: ${binaryPath}`);
}

verifyFbxConverter();
