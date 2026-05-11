import fs from "fs";
import os from "os";
import path from "path";

import AdmZip from "adm-zip";

import { inspectModelZip, InvalidZipArchiveError } from "../lib/modelPreview";
import { removeUploadFile } from "../lib/uploads";

type DeclaredZipEntry = {
  name: string;
  uncompressedSize: number;
};

const mb = 1024 * 1024;

function createTempZipPath(tempDirectory: string, name: string): string {
  return path.join(tempDirectory, `${name}.zip`);
}

function writeAdmZip(zipPath: string, entries: Array<{ name: string; data: Buffer }>): void {
  const zip = new AdmZip();

  for (const entry of entries) {
    zip.addFile(entry.name, entry.data);
  }

  zip.writeZip(zipPath);
}

function createZipLocalHeader(entry: DeclaredZipEntry): Buffer {
  const fileName = Buffer.from(entry.name);
  const header = Buffer.alloc(30 + fileName.length);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(0, 18);
  header.writeUInt32LE(entry.uncompressedSize, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);
  fileName.copy(header, 30);

  return header;
}

function createZipCentralHeader(entry: DeclaredZipEntry, localHeaderOffset: number): Buffer {
  const fileName = Buffer.from(entry.name);
  const header = Buffer.alloc(46 + fileName.length);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(0, 20);
  header.writeUInt32LE(entry.uncompressedSize, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localHeaderOffset, 42);
  fileName.copy(header, 46);

  return header;
}

function writeDeclaredSizeZip(zipPath: string, entries: DeclaredZipEntry[]): void {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let localHeaderOffset = 0;

  for (const entry of entries) {
    const localHeader = createZipLocalHeader(entry);
    const centralHeader = createZipCentralHeader(entry, localHeaderOffset);

    localHeaders.push(localHeader);
    centralHeaders.push(centralHeader);
    localHeaderOffset += localHeader.length;
  }

  const centralDirectoryOffset = localHeaderOffset;
  const centralDirectorySize = centralHeaders.reduce((total, header) => total + header.length, 0);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  fs.writeFileSync(zipPath, Buffer.concat([...localHeaders, ...centralHeaders, endOfCentralDirectory]));
}

function assertInvalidZip(zipPath: string, expectedMessagePart: string): void {
  try {
    inspectModelZip(zipPath);
  } catch (error) {
    if (error instanceof InvalidZipArchiveError && error.message.includes(expectedMessagePart)) {
      return;
    }

    throw error;
  }

  throw new Error(`Expected ZIP to be rejected: ${expectedMessagePart}`);
}

function verifyValidGlbZip(tempDirectory: string): void {
  const zipPath = createTempZipPath(tempDirectory, "valid-glb");
  writeAdmZip(zipPath, [{ name: "model.glb", data: Buffer.from("glb") }]);

  const result = inspectModelZip(zipPath);

  if (result.sourceFormat !== "glb" || result.previewConversionStatus !== "success" || !result.previewModelPath) {
    throw new Error("Expected a simple GLB ZIP to pass preview inspection.");
  }

  removeUploadFile(result.previewModelPath);
}

function verifyZipSafety(): void {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "meshfree-zip-safety-"));

  try {
    verifyValidGlbZip(tempDirectory);

    writeAdmZip(
      createTempZipPath(tempDirectory, "too-many-entries"),
      Array.from({ length: 201 }, (_, index) => ({
        name: `file-${index}.txt`,
        data: Buffer.from("x"),
      })),
    );
    assertInvalidZip(createTempZipPath(tempDirectory, "too-many-entries"), "entry count exceeds");

    writeAdmZip(createTempZipPath(tempDirectory, "too-deep"), [
      {
        name: "a/b/c/d/e/f/g/h/i/j/k/l/model.obj",
        data: Buffer.from("o model"),
      },
    ]);
    assertInvalidZip(createTempZipPath(tempDirectory, "too-deep"), "directory depth exceeds");

    writeDeclaredSizeZip(createTempZipPath(tempDirectory, "path-traversal"), [
      {
        name: "../model.obj",
        uncompressedSize: 1,
      },
    ]);
    assertInvalidZip(createTempZipPath(tempDirectory, "path-traversal"), "inside the archive root");

    writeDeclaredSizeZip(createTempZipPath(tempDirectory, "single-file-too-large"), [
      {
        name: "model.obj",
        uncompressedSize: 101 * mb,
      },
    ]);
    assertInvalidZip(createTempZipPath(tempDirectory, "single-file-too-large"), "entry size exceeds");

    writeDeclaredSizeZip(createTempZipPath(tempDirectory, "total-size-too-large"), [
      { name: "part-1.txt", uncompressedSize: 80 * mb },
      { name: "part-2.txt", uncompressedSize: 80 * mb },
      { name: "part-3.txt", uncompressedSize: 80 * mb },
    ]);
    assertInvalidZip(createTempZipPath(tempDirectory, "total-size-too-large"), "uncompressed size exceeds");

    console.log("ZIP safety verification passed.");
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

verifyZipSafety();
