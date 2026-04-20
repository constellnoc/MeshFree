import { Router } from "express";

import prisma from "../lib/prisma";
import { defaultTagLocale, syncPresetTags, toPublicTag } from "../lib/tags";

const router = Router();

function trimTextField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

router.get("/", async (req, res) => {
  const locale = trimTextField(req.query.locale) || defaultTagLocale;

  await syncPresetTags(prisma);
  const tags = await prisma.tag.findMany({
    orderBy: [{ scopeLevel: "asc" }, { name: "asc" }],
    select: {
      name: true,
      scopeLevel: true,
      translations: {
        select: {
          locale: true,
          displayName: true,
        },
      },
    },
  });

  res.json(tags.map((tag) => toPublicTag(tag, locale)));
});

export default router;
