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

export function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function addTagToList(tags: string[], rawTag: string) {
  const normalizedTag = normalizeTag(rawTag);

  if (!normalizedTag) {
    return {
      tags,
      error: "",
    };
  }

  if (normalizedTag.length < minTagLength || normalizedTag.length > maxTagLength) {
    return {
      tags,
      error: `Each tag must be between ${minTagLength} and ${maxTagLength} characters.`,
    };
  }

  if (tags.includes(normalizedTag)) {
    return {
      tags,
      error: "",
    };
  }

  if (tags.length >= maxTagsPerSubmission) {
    return {
      tags,
      error: `Please use up to ${maxTagsPerSubmission} tags.`,
    };
  }

  return {
    tags: [...tags, normalizedTag],
    error: "",
  };
}

export function validateTagList(tags: string[]) {
  if (tags.length > maxTagsPerSubmission) {
    return `Please use up to ${maxTagsPerSubmission} tags.`;
  }

  for (const tag of tags) {
    const normalizedTag = normalizeTag(tag);

    if (normalizedTag.length < minTagLength || normalizedTag.length > maxTagLength) {
      return `Each tag must be between ${minTagLength} and ${maxTagLength} characters.`;
    }
  }

  return "";
}
