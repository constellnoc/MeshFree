import type { TagScopeLevel } from "../types/tag";

export const currentTagLocale = "en";
export const maxSelectedTagsPerSubmission = 5;
export const maxSuggestedTagsPerSubmission = 5;
export const minTagLength = 2;
export const maxTagLength = 20;

export function normalizeTagText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function addSuggestedTagToList(tags: string[], rawTag: string) {
  const normalizedTag = normalizeTagText(rawTag);

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

  if (tags.length >= maxSuggestedTagsPerSubmission) {
    return {
      tags,
      error: `Please use up to ${maxSuggestedTagsPerSubmission} suggested tags.`,
    };
  }

  return {
    tags: [...tags, normalizedTag],
    error: "",
  };
}

export function validateSuggestedTagList(tags: string[]) {
  if (tags.length > maxSuggestedTagsPerSubmission) {
    return `Please use up to ${maxSuggestedTagsPerSubmission} suggested tags.`;
  }

  for (const tag of tags) {
    const normalizedTag = normalizeTagText(tag);

    if (normalizedTag.length < minTagLength || normalizedTag.length > maxTagLength) {
      return `Each tag must be between ${minTagLength} and ${maxTagLength} characters.`;
    }
  }

  return "";
}

export function getScopeLevelClassName(scopeLevel: TagScopeLevel) {
  return `tag-scope-${scopeLevel}`;
}
