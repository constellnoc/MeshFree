import fs from "fs";
import path from "path";

import { createPreviewConversionResult } from "../lib/previewConversion";
import { removeUploadFile, uploadsDir } from "../lib/uploads";

function resolveZipPath(input: string): string {
  const candidates = [
    path.isAbsolute(input) ? input : null,
    path.resolve(input),
    path.join(uploadsDir, input),
    path.join(uploadsDir, "models", input),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`ZIP file was not found. Checked: ${candidates.join(", ")}`);
}

async function diagnosePreviewConversion(): Promise<void> {
  const [, , zipInput, ...options] = process.argv;
  const shouldKeepPreview = options.includes("--keep-preview");

  if (!zipInput) {
    throw new Error("Usage: npm run diagnose:preview -- <zip-path-or-file-name> [--keep-preview]");
  }

  const zipPath = resolveZipPath(zipInput);
  const startedAt = Date.now();
  const result = await createPreviewConversionResult(zipPath);

  console.log(`Preview conversion diagnosis for: ${zipPath}`);
  console.log(`Elapsed: ${Date.now() - startedAt}ms`);
  console.log(`sourceFormat: ${result.sourceFormat}`);
  console.log(`previewConversionStatus: ${result.previewConversionStatus}`);
  console.log(`previewConversionMessage: ${result.previewConversionMessage ?? "(none)"}`);
  console.log(`hasMissingTextures: ${result.hasMissingTextures}`);
  console.log(`previewModelPath: ${result.previewModelPath ?? "(none)"}`);

  if (result.previewModelPath && !shouldKeepPreview) {
    removeUploadFile(result.previewModelPath);
    console.log(`Removed diagnostic preview file: ${result.previewModelPath}`);
  }
}

diagnosePreviewConversion().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
