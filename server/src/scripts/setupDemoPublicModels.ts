import fs from "fs";
import path from "path";

import prisma from "../lib/prisma";

const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const coversDir = path.join(uploadsDir, "covers");
const modelsDir = path.join(uploadsDir, "models");
const demoContact = "demo@meshfree.local";

const sampleCoverBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn4fQAAAABJRU5ErkJggg==";
const emptyZipBase64 = "UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==";

const demoModels = [
  {
    title: "Demo Temple Asset Pack",
    description: "Low-poly temple practice assets prepared for the public gallery demo.",
    coverFileName: "demo-temple.png",
    zipFileName: "demo-temple.zip",
  },
  {
    title: "Demo Forest Prop Set",
    description: "A lightweight environment prop pack used to verify list, detail, and download.",
    coverFileName: "demo-forest.png",
    zipFileName: "demo-forest.zip",
  },
  {
    title: "Demo Sci-Fi Crate Bundle",
    description: "Simple placeholder resources for validating the first public browsing loop.",
    coverFileName: "demo-scifi.png",
    zipFileName: "demo-scifi.zip",
  },
];

function ensureUploadDirectories() {
  for (const directory of [uploadsDir, coversDir, modelsDir]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function writeDemoFile(filePath: string, base64Content: string) {
  fs.writeFileSync(filePath, Buffer.from(base64Content, "base64"));
}

async function upsertDemoSubmission(input: {
  title: string;
  description: string;
  coverFileName: string;
  zipFileName: string;
}) {
  const coverRelativePath = path.posix.join("covers", input.coverFileName);
  const zipRelativePath = path.posix.join("models", input.zipFileName);

  writeDemoFile(path.join(coversDir, input.coverFileName), sampleCoverBase64);
  writeDemoFile(path.join(modelsDir, input.zipFileName), emptyZipBase64);

  const existingSubmission = await prisma.submission.findFirst({
    where: {
      title: input.title,
      contact: demoContact,
    },
  });

  if (existingSubmission) {
    await prisma.submission.update({
      where: {
        id: existingSubmission.id,
      },
      data: {
        description: input.description,
        coverImagePath: coverRelativePath,
        modelZipPath: zipRelativePath,
        status: "approved",
        rejectReason: null,
        reviewedAt: new Date(),
      },
    });

    return;
  }

  await prisma.submission.create({
    data: {
      title: input.title,
      description: input.description,
      contact: demoContact,
      coverImagePath: coverRelativePath,
      modelZipPath: zipRelativePath,
      status: "approved",
      reviewedAt: new Date(),
    },
  });
}

async function main() {
  ensureUploadDirectories();

  for (const demoModel of demoModels) {
    await upsertDemoSubmission(demoModel);
  }

  console.log(`Prepared ${demoModels.length} demo public models.`);
}

main()
  .catch((error) => {
    console.error("Failed to prepare demo public models.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
