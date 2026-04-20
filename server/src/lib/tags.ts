export const recommendedTags = [
  "low-poly",
  "stylized",
  "character",
  "environment",
  "prop",
  "weapon",
  "architecture",
  "vehicle",
  "nature",
  "sci-fi",
] as const;

export const maxTagsPerSubmission = 5;
export const minTagLength = 2;
export const maxTagLength = 20;

export class InvalidSubmissionTagsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSubmissionTagsError";
  }
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTag(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function parseTagInput(value: unknown): string[] {
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

export function normalizeAndValidateTags(value: unknown): string[] {
  const normalizedTags: string[] = [];

  for (const rawTag of parseTagInput(value)) {
    const tag = normalizeTag(rawTag);

    if (!tag) {
      continue;
    }

    if (tag.length < minTagLength || tag.length > maxTagLength) {
      throw new InvalidSubmissionTagsError(
        `Each tag must be between ${minTagLength} and ${maxTagLength} characters.`,
      );
    }

    if (!normalizedTags.includes(tag)) {
      normalizedTags.push(tag);
    }
  }

  if (normalizedTags.length > maxTagsPerSubmission) {
    throw new InvalidSubmissionTagsError(`Please use up to ${maxTagsPerSubmission} tags.`);
  }

  return normalizedTags;
}

export function normalizeTagFilter(value: unknown): string {
  const tags = normalizeAndValidateTags(value);

  if (tags.length !== 1) {
    throw new InvalidSubmissionTagsError("Please provide exactly one tag filter.");
  }

  return tags[0];
}

export function mapSubmissionTags(
  tags: Array<{
    tag: {
      name: string;
    };
  }>,
) {
  return tags.map((entry) => entry.tag.name).sort((left, right) => left.localeCompare(right));
}
