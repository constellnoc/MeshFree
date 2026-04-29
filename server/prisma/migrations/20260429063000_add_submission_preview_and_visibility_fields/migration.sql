-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "coverImagePath" TEXT NOT NULL,
    "modelZipPath" TEXT NOT NULL,
    "previewModelPath" TEXT,
    "sourceFormat" TEXT NOT NULL DEFAULT 'unknown',
    "previewConversionStatus" TEXT NOT NULL DEFAULT 'not_attempted',
    "previewConversionMessage" TEXT,
    "isPreviewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPublicVisible" BOOLEAN NOT NULL DEFAULT false,
    "hasMissingTextures" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Submission" (
    "id",
    "title",
    "description",
    "contact",
    "coverImagePath",
    "modelZipPath",
    "previewModelPath",
    "sourceFormat",
    "previewConversionStatus",
    "previewConversionMessage",
    "isPreviewEnabled",
    "isPublicVisible",
    "hasMissingTextures",
    "status",
    "rejectReason",
    "createdAt",
    "reviewedAt",
    "updatedAt"
)
SELECT
    "id",
    "title",
    "description",
    "contact",
    "coverImagePath",
    "modelZipPath",
    "previewModelPath",
    CASE
        WHEN "previewModelPath" IS NOT NULL THEN 'glb'
        ELSE 'unknown'
    END,
    CASE
        WHEN "previewModelPath" IS NOT NULL THEN 'success'
        ELSE 'not_attempted'
    END,
    NULL,
    true,
    CASE
        WHEN "status" = 'approved' THEN true
        ELSE false
    END,
    false,
    "status",
    "rejectReason",
    "createdAt",
    "reviewedAt",
    "updatedAt"
FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
