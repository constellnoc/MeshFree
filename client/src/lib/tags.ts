import type { TagScopeLevel } from "../types/tag";

export const maxSelectedTagsPerSubmission = 5;
export const maxSuggestedTagsPerSubmission = 5;
export const minTagLength = 2;
export const maxTagLength = 20;

interface SuggestedTagValidationMessages {
  tagLength: (minLength: number, maxLength: number) => string;
  maxSuggestedTags: (maxTags: number) => string;
}

export function normalizeTagText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function addSuggestedTagToList(
  tags: string[],
  rawTag: string,
  messages: SuggestedTagValidationMessages,
) {
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
      error: messages.tagLength(minTagLength, maxTagLength),
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
      error: messages.maxSuggestedTags(maxSuggestedTagsPerSubmission),
    };
  }

  return {
    tags: [...tags, normalizedTag],
    error: "",
  };
}

export function validateSuggestedTagList(tags: string[], messages: SuggestedTagValidationMessages) {
  if (tags.length > maxSuggestedTagsPerSubmission) {
    return messages.maxSuggestedTags(maxSuggestedTagsPerSubmission);
  }

  for (const tag of tags) {
    const normalizedTag = normalizeTagText(tag);

    if (normalizedTag.length < minTagLength || normalizedTag.length > maxTagLength) {
      return messages.tagLength(minTagLength, maxTagLength);
    }
  }

  return "";
}

export function getScopeLevelClassName(scopeLevel: TagScopeLevel) {
  return `tag-scope-${scopeLevel}`;
}
