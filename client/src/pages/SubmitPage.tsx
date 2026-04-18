import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";

import { createSubmission } from "../api/submissions";
import type { SubmissionResult } from "../types/submission";

const maxCoverSize = 2 * 1024 * 1024;
const maxModelZipSize = 20 * 1024 * 1024;
const allowedCoverExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const submissionDraftStorageKey = "meshfree_submission_draft";

interface SubmissionDraft {
  title: string;
  description: string;
  contact: string;
}

function hasAllowedExtension(fileName: string, allowedExtensions: string[]): boolean {
  const lowerCaseName = fileName.toLowerCase();
  return allowedExtensions.some((extension) => lowerCaseName.endsWith(extension));
}

function getSubmissionErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Failed to submit. Please try again.";
  }

  return "Failed to submit. Please try again.";
}

export function SubmitPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const modelZipInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modelZipFile, setModelZipFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    } catch {
      localStorage.removeItem(submissionDraftStorageKey);
    }
  }, []);

  useEffect(() => {
    const hasDraftContent = Boolean(title || description || contact);

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
      } satisfies SubmissionDraft),
    );
  }, [title, description, contact]);

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCoverFile(event.target.files?.[0] ?? null);
  };

  const handleModelZipChange = (event: ChangeEvent<HTMLInputElement>) => {
    setModelZipFile(event.target.files?.[0] ?? null);
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
    <section className="page-grid submit-grid">
      <div className="card">
        <p className="section-kicker">Public Submission</p>
        <h2>Submit a model for admin review</h2>
        <p>
          Upload one cover image and one ZIP file. After submission, the resource
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
            <button className="button-link form-submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>

          <p className="form-help">
            Text fields are saved locally in this browser. File inputs must be selected again
            after refresh or reset.
          </p>
        </form>
      </div>

      <div className="card">
        <h2>Submission rules</h2>
        <ul className="plain-list">
          <li>All fields are required.</li>
          <li>Only one cover image and one ZIP file are allowed.</li>
          <li>The model will become public only after admin approval.</li>
        </ul>

        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}

        {successResult ? (
          <div className="form-message success-message">
            <p>{successResult.message}</p>
            <p>Submission ID: {successResult.submissionId}</p>
            <p>Status: {successResult.status}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
