import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import axios from "axios";

import { createSubmission } from "../api/submissions";
import { getPublicTags } from "../api/tags";
import {
  addSuggestedTagToList,
  currentTagLocale,
  getScopeLevelClassName,
  maxSelectedTagsPerSubmission,
  validateSuggestedTagList,
} from "../lib/tags";
import type { PublicTag } from "../types/tag";
import type { SubmissionResult } from "../types/submission";

const maxCoverSize = 2 * 1024 * 1024;
const maxModelZipSize = 50 * 1024 * 1024;
const allowedCoverExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const submissionDraftStorageKey = "meshfree_submission_draft";

interface SubmissionDraft {
  title: string;
  description: string;
  contact: string;
  selectedTagSlugs: string[];
  suggestedTags: string[];
}

function hasAllowedExtension(fileName: string, allowedExtensions: string[]): boolean {
  const lowerCaseName = fileName.toLowerCase();
  return allowedExtensions.some((extension) => lowerCaseName.endsWith(extension));
}

function getSubmissionErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Failed to upload. Please try again.";
  }

  return "Failed to upload. Please try again.";
}

export function UploadPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const modelZipInputRef = useRef<HTMLInputElement | null>(null);
  const [availableTags, setAvailableTags] = useState<PublicTag[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modelZipFile, setModelZipFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getPublicTags({ locale: currentTagLocale });
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to load preset tags.", error);
      }
    };

    void loadTags();
  }, []);

  useEffect(() => {
    const storedDraft = localStorage.getItem(submissionDraftStorageKey);

    if (!storedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(storedDraft) as Partial<SubmissionDraft>;
      setTitle(typeof draft.title === "string" ? draft.title : "");
      setDescription(typeof draft.description === "string" ? draft.description : "");
      setContact(typeof draft.contact === "string" ? draft.contact : "");
      setSelectedTagSlugs(
        Array.isArray(draft.selectedTagSlugs)
          ? draft.selectedTagSlugs.filter((tag): tag is string => typeof tag === "string")
          : [],
      );
      setSuggestedTags(
        Array.isArray(draft.suggestedTags)
          ? draft.suggestedTags.filter((tag): tag is string => typeof tag === "string")
          : [],
      );
    } catch {
      localStorage.removeItem(submissionDraftStorageKey);
    }
  }, []);

  useEffect(() => {
    const hasDraftContent = Boolean(
      title || description || contact || selectedTagSlugs.length > 0 || suggestedTags.length > 0,
    );

    if (!hasDraftContent) {
      localStorage.removeItem(submissionDraftStorageKey);
      return;
    }

    localStorage.setItem(
      submissionDraftStorageKey,
      JSON.stringify({
        title,
        description,
        contact,
        selectedTagSlugs,
        suggestedTags,
      } satisfies SubmissionDraft),
    );
  }, [contact, description, selectedTagSlugs, suggestedTags, title]);

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCoverFile(event.target.files?.[0] ?? null);
  };

  const handleModelZipChange = (event: ChangeEvent<HTMLInputElement>) => {
    setModelZipFile(event.target.files?.[0] ?? null);
  };

  const handleToggleSelectedTag = (tagSlug: string) => {
    setSelectedTagSlugs((currentTags) => {
      if (currentTags.includes(tagSlug)) {
        return currentTags.filter((tag) => tag !== tagSlug);
      }

      if (currentTags.length >= maxSelectedTagsPerSubmission) {
        setErrorMessage(`Please select up to ${maxSelectedTagsPerSubmission} preset tags.`);
        return currentTags;
      }

      return [...currentTags, tagSlug];
    });
  };

  const handleAddTag = (rawTag: string) => {
    const nextState = addSuggestedTagToList(suggestedTags, rawTag);

    setErrorMessage(nextState.error);

    if (nextState.tags !== suggestedTags) {
      setSuggestedTags(nextState.tags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSuggestedTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    handleAddTag(tagInput);
  };

  const validateForm = (): string => {
    if (!title.trim() || !description.trim() || !contact.trim()) {
      return "Please complete all required text fields.";
    }

    if (!coverFile || !modelZipFile) {
      return "Please upload both a cover image and a ZIP file.";
    }

    if (!hasAllowedExtension(coverFile.name, allowedCoverExtensions)) {
      return "Cover image must be a JPG, JPEG, PNG, or WEBP file.";
    }

    if (coverFile.size > maxCoverSize) {
      return "Cover image must not exceed 2MB.";
    }

    if (!modelZipFile.name.toLowerCase().endsWith(".zip")) {
      return "Model file must be a ZIP archive.";
    }

    if (modelZipFile.size > maxModelZipSize) {
      return "Model ZIP must not exceed 20MB.";
    }

    if (selectedTagSlugs.length > maxSelectedTagsPerSubmission) {
      return `Please select up to ${maxSelectedTagsPerSubmission} preset tags.`;
    }

    const tagValidationMessage = validateSuggestedTagList(suggestedTags);

    if (tagValidationMessage) {
      return tagValidationMessage;
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setSuccessResult(null);
      setErrorMessage(validationMessage);
      return;
    }

    if (!coverFile || !modelZipFile) {
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("contact", contact.trim());
    formData.append("selectedTagSlugs", JSON.stringify(selectedTagSlugs));
    formData.append("suggestedTags", JSON.stringify(suggestedTags));
    formData.append("cover", coverFile);
    formData.append("modelZip", modelZipFile);

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessResult(null);

    try {
      const result = await createSubmission(formData);
      setSuccessResult(result);
      setTitle("");
      setDescription("");
      setContact("");
      setSelectedTagSlugs([]);
      setSuggestedTags([]);
      setTagInput("");
      setCoverFile(null);
      setModelZipFile(null);
      localStorage.removeItem(submissionDraftStorageKey);
      formRef.current?.reset();
    } catch (error) {
      setErrorMessage(getSubmissionErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDraft = () => {
    setTitle("");
    setDescription("");
    setContact("");
    setSelectedTagSlugs([]);
    setSuggestedTags([]);
    setTagInput("");
    setCoverFile(null);
    setModelZipFile(null);
    setErrorMessage("");
    setSuccessResult(null);
    localStorage.removeItem(submissionDraftStorageKey);
    formRef.current?.reset();

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }

    if (modelZipInputRef.current) {
      modelZipInputRef.current.value = "";
    }
  };

  return (
    <section className="page-grid upload-grid">
      <div className="card">
        <p className="section-kicker">Public Upload</p>
        <h2>Upload a model for admin review</h2>
        <p>
          Upload one cover image and one ZIP file. After upload, the resource
          will stay in <strong>pending</strong> status until the administrator reviews it.
        </p>

        <form ref={formRef} className="submission-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Title</span>
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Temple Asset Pack"
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Description</span>
            <textarea
              className="form-input form-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the model pack and its intended use."
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Contact info (QQ / WeChat / Email)</span>
            <input
              className="form-input"
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Email: your-name@example.com"
              disabled={isSubmitting}
            />
          </label>

          <div className="form-field">
            <span className="form-label">Preset tags</span>
            <span className="form-help">
              Select up to {maxSelectedTagsPerSubmission} public tags. These are the tags that can
              become visible after review.
            </span>
            <div className="tag-chip-list">
              {availableTags.map((tag) => (
                <button
                  key={tag.slug}
                  className={[
                    "tag-chip",
                    getScopeLevelClassName(tag.scopeLevel),
                    selectedTagSlugs.includes(tag.slug) ? "tag-chip-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  type="button"
                  onClick={() => handleToggleSelectedTag(tag.slug)}
                  disabled={isSubmitting}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <span className="form-label">Suggested tags</span>
            <div className="tag-input-row">
              <input
                className="form-input"
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Suggest a new tag for admin review"
                disabled={isSubmitting}
              />
              <button
                className="button-link secondary"
                type="button"
                onClick={() => handleAddTag(tagInput)}
                disabled={isSubmitting || !tagInput.trim()}
              >
                Add suggestion
              </button>
            </div>
            <span className="form-help">
              Suggested tags stay private. Only the administrator can decide whether they become a
              new public tag or an alias for an existing tag.
            </span>
            {suggestedTags.length > 0 ? (
              <div className="selected-tag-list" aria-live="polite">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    className="selected-tag-chip"
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={isSubmitting}
                  >
                    {tag}
                    <span aria-hidden="true"> ×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <label className="form-field">
            <span className="form-label">Cover image</span>
            <input
              ref={coverInputRef}
              className="form-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleCoverChange}
              disabled={isSubmitting}
            />
            <span className="form-help">Accepted: JPG, JPEG, PNG, WEBP. Max 2MB.</span>
          </label>

          <label className="form-field">
            <span className="form-label">Model ZIP</span>
            <input
              ref={modelZipInputRef}
              className="form-input"
              type="file"
              accept=".zip,application/zip"
              onChange={handleModelZipChange}
              disabled={isSubmitting}
            />
            <span className="form-help">Accepted: ZIP only. Max 20MB.</span>
          </label>

          <div className="form-actions">
            <button
              className="button-link secondary form-reset-button"
              type="button"
              onClick={handleResetDraft}
              disabled={isSubmitting}
            >
              Reset
            </button>
            <button className="button-link form-upload-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload for review"}
            </button>
          </div>

          <p className="form-help">
            Text fields, selected preset tags, and suggested tags are saved locally in this browser.
            File inputs must be selected again after refresh or reset.
          </p>
        </form>
      </div>

      <div className="card">
        <h2>Upload rules</h2>
        <ul className="plain-list">
          <li>All fields are required.</li>
          <li>Only one cover image and one ZIP file are allowed.</li>
          <li>The model will become public only after admin approval.</li>
        </ul>

        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}

        {successResult ? (
          <div className="form-message success-message">
            <p>{successResult.message}</p>
            <p>Upload ID: {successResult.submissionId}</p>
            <p>Status: {successResult.status}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
