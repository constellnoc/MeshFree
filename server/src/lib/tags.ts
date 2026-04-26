import type { Prisma, PrismaClient, TagScopeLevel } from "../generated/prisma/client";

export const defaultTagLocale = "en";
export const supportedTagLocales = ["en", "zh-CN"] as const;
export const maxSelectedTagsPerSubmission = 5;
export const maxSuggestedTagsPerSubmission = 5;
export const minTagLength = 2;
export const maxTagLength = 20;
export const unresolvedTagLocale = "und";

export type PublicTag = {
  slug: string;
  label: string;
  scopeLevel: TagScopeLevel;
};

type PresetTagDefinition = {
  slug: string;
  scopeLevel: TagScopeLevel;
  translations: {
    en: string;
    "zh-CN": string;
  };
  aliases?: Partial<Record<(typeof supportedTagLocales)[number], string[]>>;
};

export const presetTagDefinitions: PresetTagDefinition[] = [
  {
    slug: "environment",
    scopeLevel: "broad",
    translations: { en: "Environment", "zh-CN": "环境" },
    aliases: { en: ["scene"], "zh-CN": ["场景"] },
  },
  {
    slug: "character",
    scopeLevel: "broad",
    translations: { en: "Character", "zh-CN": "角色" },
    aliases: { "zh-CN": ["人物"] },
  },
  {
    slug: "weapon",
    scopeLevel: "broad",
    translations: { en: "Weapon", "zh-CN": "武器" },
    aliases: { "zh-CN": ["兵器"] },
  },
  {
    slug: "prop",
    scopeLevel: "medium",
    translations: { en: "Prop", "zh-CN": "道具" },
  },
  {
    slug: "architecture",
    scopeLevel: "medium",
    translations: { en: "Architecture", "zh-CN": "建筑" },
  },
  {
    slug: "vehicle",
    scopeLevel: "medium",
    translations: { en: "Vehicle", "zh-CN": "载具" },
  },
  {
    slug: "nature",
    scopeLevel: "medium",
    translations: { en: "Nature", "zh-CN": "自然" },
  },
  {
    slug: "stylized",
    scopeLevel: "specific",
    translations: { en: "Stylized", "zh-CN": "风格化" },
  },
  {
    slug: "low-poly",
    scopeLevel: "specific",
    translations: { en: "Low Poly", "zh-CN": "低多边形" },
    aliases: { en: ["lowpoly"], "zh-CN": ["低模"] },
  },
  {
    slug: "sci-fi",
    scopeLevel: "specific",
    translations: { en: "Sci-Fi", "zh-CN": "科幻" },
  },
];

export class InvalidSubmissionTagsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSubmissionTagsError";
  }
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTagText(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function parseStringListInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value !== "string") {
    return [];
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return [];
  }

  if (normalizedValue.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalizedValue) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch {
      throw new InvalidSubmissionTagsError("Invalid request data.");
    }
  }

  return normalizedValue.split(/[,\n，]/);
}

function validateTagValueLength(tag: string) {
  if (tag.length < minTagLength || tag.length > maxTagLength) {
    throw new InvalidSubmissionTagsError(
      `Each tag must be between ${minTagLength} and ${maxTagLength} characters.`,
    );
  }
}

export function normalizeAndValidateSelectedTagSlugs(value: unknown): string[] {
  const normalizedTags: string[] = [];

  for (const rawTag of parseStringListInput(value)) {
    const tag = normalizeTagText(rawTag);

    if (!tag) {
      continue;
    }

    if (!normalizedTags.includes(tag)) {
      normalizedTags.push(tag);
    }
  }

  if (normalizedTags.length > maxSelectedTagsPerSubmission) {
    throw new InvalidSubmissionTagsError(`Please use up to ${maxSelectedTagsPerSubmission} selected tags.`);
  }

  return normalizedTags;
}

export function normalizeAndValidateSuggestedTags(value: unknown): string[] {
  const normalizedTags: string[] = [];

  for (const rawTag of parseStringListInput(value)) {
    const tag = normalizeTagText(rawTag);

    if (!tag) {
      continue;
    }

    validateTagValueLength(tag);

    if (!normalizedTags.includes(tag)) {
      normalizedTags.push(tag);
    }
  }

  if (normalizedTags.length > maxSuggestedTagsPerSubmission) {
    throw new InvalidSubmissionTagsError(`Please use up to ${maxSuggestedTagsPerSubmission} suggested tags.`);
  }

  return normalizedTags;
}

export function normalizeTagFilters(value: unknown): string[] {
  return normalizeAndValidateSelectedTagSlugs(value);
}

export function normalizeTagSlug(value: unknown) {
  return typeof value === "string" ? normalizeTagText(value) : "";
}

export async function syncPresetTags(client: PrismaClient | Prisma.TransactionClient) {
  for (const definition of presetTagDefinitions) {
    const tag = await client.tag.upsert({
      where: {
        name: definition.slug,
      },
      update: {
        scopeLevel: definition.scopeLevel,
      },
      create: {
        name: definition.slug,
        scopeLevel: definition.scopeLevel,
      },
      select: {
        id: true,
      },
    });

    for (const locale of supportedTagLocales) {
      await client.tagTranslation.upsert({
        where: {
          tagId_locale: {
            tagId: tag.id,
            locale,
          },
        },
        update: {
          displayName: definition.translations[locale],
          normalizedDisplayName: normalizeTagText(definition.translations[locale]),
        },
        create: {
          tagId: tag.id,
          locale,
          displayName: definition.translations[locale],
          normalizedDisplayName: normalizeTagText(definition.translations[locale]),
        },
      });
    }

    for (const locale of supportedTagLocales) {
      for (const alias of definition.aliases?.[locale] ?? []) {
        await client.tagAlias.upsert({
          where: {
            locale_normalizedValue: {
              locale,
              normalizedValue: normalizeTagText(alias),
            },
          },
          update: {
            tagId: tag.id,
            value: alias,
          },
          create: {
            tagId: tag.id,
            locale,
            value: alias,
            normalizedValue: normalizeTagText(alias),
          },
        });
      }
    }
  }
}

type TagRecord = {
  name: string;
  scopeLevel: TagScopeLevel;
  translations: Array<{
    locale: string;
    displayName: string;
  }>;
};

function resolveTagLabel(tag: TagRecord, locale: string) {
  return (
    tag.translations.find((translation) => translation.locale === locale)?.displayName ??
    tag.translations.find((translation) => translation.locale === defaultTagLocale)?.displayName ??
    tag.translations[0]?.displayName ??
    tag.name
  );
}

export function toPublicTag(tag: TagRecord, locale: string): PublicTag {
  return {
    slug: tag.name,
    label: resolveTagLabel(tag, locale),
    scopeLevel: tag.scopeLevel,
  };
}

export function mapSubmissionTags(
  tags: Array<{
    tag: TagRecord;
  }>,
  locale: string,
) {
  return tags
    .map((entry) => toPublicTag(entry.tag, locale))
    .sort((left, right) => left.label.localeCompare(right.label));
}
