import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  approveSubmission,
  clearAdminToken,
  downloadAdminSubmissionZip,
  getAdminSubmissionDetail,
  getAdminSubmissions,
  getAdminToken,
  rejectSubmission,
  deleteSubmission,
  updateSubmissionTags,
} from "../api/admin";
import { getPublicTags } from "../api/tags";
import { useLanguage } from "../contexts/LanguageContext";
import { toIntlLocale } from "../lib/i18n";
import { getScopeLevelClassName, maxSelectedTagsPerSubmission } from "../lib/tags";
import type { AdminSubmissionDetail, AdminSubmissionStatus, AdminSubmissionSummary } from "../types/admin";
import type { PublicTag } from "../types/tag";

type SubmissionFilter = "all" | AdminSubmissionStatus;

const filterOptions: SubmissionFilter[] = ["pending", "approved", "rejected", "all"];

function formatDateTime(dateString: string | null, locale: string, notReviewedLabel: string): string {
  if (!dateString) {
    return notReviewedLabel;
  }

  return new Date(dateString).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDashboardErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallbackMessage;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export function AdminDashboardPage() {
  const { locale, copy } = useLanguage();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SubmissionFilter>("pending");
  const [availableTags, setAvailableTags] = useState<PublicTag[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmissionSummary[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionDetail | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const getLocalizedSuccessMessage = (message: string) => {
    switch (message) {
      case "Submission tags updated successfully.":
        return copy.admin.successTagsSaved;
      case "Submission approved successfully.":
        return copy.admin.successApproved;
      case "Submission rejected successfully.":
        return copy.admin.successRejected;
      case "Submission deleted successfully.":
        return copy.admin.successDeleted;
      default:
        return message;
    }
  };

  const selectedSummary = useMemo(
    () => submissions.find((submission) => submission.id === selectedSubmissionId) ?? null,
    [selectedSubmissionId, submissions],
  );

  const handleUnauthorized = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        const tags = await getPublicTags({ locale });
        setAvailableTags(tags);
      } catch (error) {
        setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
      }
    };

    void loadAvailableTags();
  }, [locale]);

  const loadSubmissions = async (preferredSubmissionId?: number | null) => {
    if (!getAdminToken()) {
      handleUnauthorized();
      return;
    }

    setIsLoadingList(true);
    setErrorMessage("");

    try {
      const result = await getAdminSubmissions(filter === "all" ? undefined : filter, locale);
      setSubmissions(result);

      const nextSelectedId =
        preferredSubmissionId && result.some((submission) => submission.id === preferredSubmissionId)
          ? preferredSubmissionId
          : result[0]?.id ?? null;

      setSelectedSubmissionId(nextSelectedId);

      if (!nextSelectedId) {
        setSelectedSubmission(null);
        setRejectReason("");
        setSelectedTagSlugs([]);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    void loadSubmissions(selectedSubmissionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, locale]);

  useEffect(() => {
    const loadSubmissionDetail = async () => {
      if (!selectedSubmissionId) {
        setSelectedSubmission(null);
        setRejectReason("");
        setSelectedTagSlugs([]);
        return;
      }

      setIsLoadingDetail(true);

      try {
        const detail = await getAdminSubmissionDetail(selectedSubmissionId, locale);
        setSelectedSubmission(detail);
        setRejectReason(detail.rejectReason ?? "");
        setSelectedTagSlugs(detail.tags.map((tag) => tag.slug));
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleUnauthorized();
          return;
        }

        setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
      } finally {
        setIsLoadingDetail(false);
      }
    };

    void loadSubmissionDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, selectedSubmissionId]);

  const handleLogout = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  const handleToggleSelectedTag = (tagSlug: string) => {
    setSelectedTagSlugs((currentTags) => {
      if (currentTags.includes(tagSlug)) {
        return currentTags.filter((tag) => tag !== tagSlug);
      }

      if (currentTags.length >= maxSelectedTagsPerSubmission) {
        setErrorMessage(copy.admin.publicTagsLimit(maxSelectedTagsPerSubmission));
        return currentTags;
      }

      return [...currentTags, tagSlug];
    });
  };

  const handleSaveTags = async () => {
    if (!selectedSubmission) {
      return;
    }

    if (selectedTagSlugs.length > maxSelectedTagsPerSubmission) {
      setErrorMessage(copy.admin.publicTagsLimit(maxSelectedTagsPerSubmission));
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await updateSubmissionTags(selectedSubmission.id, selectedTagSlugs, locale);
      setSelectedSubmission(result.submission);
      setSelectedTagSlugs(result.submission.tags.map((tag) => tag.slug));
      setSuccessMessage(result.message);
      await loadSubmissions(selectedSubmission.id);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) {
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await approveSubmission(selectedSubmission.id);
      setSuccessMessage(result.message);
      await loadSubmissions(selectedSubmission.id);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) {
      return;
    }

    if (!rejectReason.trim()) {
      setErrorMessage(copy.admin.requiredRejectReason);
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await rejectSubmission(selectedSubmission.id, rejectReason.trim());
      setSuccessMessage(result.message);
      await loadSubmissions(selectedSubmission.id);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubmission) {
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await deleteSubmission(selectedSubmission.id);
      setSuccessMessage(result.message);
      await loadSubmissions(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!selectedSubmission) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const zipBlob = await downloadAdminSubmissionZip(selectedSubmission.id);
      const objectUrl = window.URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = selectedSubmission.modelZipName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error));
    }
  };

  return (
    <section className="page-grid admin-grid">
      <div className="card">
        <div className="admin-toolbar">
          <div>
            <p className="section-kicker">{copy.admin.kicker}</p>
            <h2>{copy.admin.title}</h2>
            <p>{copy.admin.intro}</p>
          </div>
          <button className="button-link secondary" type="button" onClick={handleLogout}>
            {copy.admin.logout}
          </button>
        </div>

        <div className="admin-filters">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={filter === option ? "admin-filter admin-filter-active" : "admin-filter"}
              onClick={() => setFilter(option)}
            >
              {copy.admin.filters[option]}
            </button>
          ))}
        </div>

        {isLoadingList ? <p>{copy.admin.loadingSubmissions}</p> : null}

        {!isLoadingList && submissions.length === 0 ? (
          <p>{copy.admin.noMatchingSubmissions}</p>
        ) : null}

        {!isLoadingList && submissions.length > 0 ? (
          <div className="admin-submission-list">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                className={
                  submission.id === selectedSubmissionId
                    ? "admin-submission-item admin-submission-item-active"
                    : "admin-submission-item"
                }
                onClick={() => {
                  setSuccessMessage("");
                  setErrorMessage("");
                  setSelectedSubmissionId(submission.id);
                }}
              >
                <div className="admin-submission-header">
                  <strong>{submission.title}</strong>
                  <span className={`status-badge status-${submission.status}`}>
                    {copy.admin.status[submission.status]}
                  </span>
                </div>
                <p>{submission.description}</p>
                {submission.tags.length > 0 ? (
                  <div className="selected-tag-list model-tag-list">
                    {submission.tags.map((tag) => (
                      <span
                        key={tag.slug}
                        className={`selected-tag-chip ${getScopeLevelClassName(tag.scopeLevel)}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="admin-submission-meta">
                  {copy.admin.createdOn(
                    formatDateTime(submission.createdAt, toIntlLocale(locale), copy.admin.notReviewedYet),
                  )}
                </p>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="form-message success-message">{getLocalizedSuccessMessage(successMessage)}</p> : null}

        {!selectedSummary && !isLoadingList ? (
          <div>
            <h2>{copy.admin.noSubmissionSelectedTitle}</h2>
            <p>{copy.admin.noSubmissionSelectedBody}</p>
          </div>
        ) : null}

        {selectedSummary ? (
          <div className="admin-detail">
            <p className="section-kicker">{copy.admin.detailKicker}</p>
            <h2>{selectedSummary.title}</h2>
            <p>{selectedSummary.description}</p>

            {isLoadingDetail ? <p>{copy.admin.loadingSelectedSubmission}</p> : null}

            {selectedSubmission && !isLoadingDetail ? (
              <>
                <img
                  src={selectedSubmission.coverImageUrl}
                  alt={selectedSubmission.title}
                  className="admin-detail-cover"
                />

                <div className="admin-detail-meta">
                  <p>
                    <strong>{copy.admin.statusLabel}:</strong> {copy.admin.status[selectedSubmission.status]}
                  </p>
                  <p>
                    <strong>{copy.admin.contactLabel}:</strong> {selectedSubmission.contact}
                  </p>
                  <p>
                    <strong>{copy.admin.zipFileLabel}:</strong> {selectedSubmission.modelZipName}
                  </p>
                  <p>
                    <strong>{copy.admin.createdLabel}:</strong>{" "}
                    {formatDateTime(selectedSubmission.createdAt, toIntlLocale(locale), copy.admin.notReviewedYet)}
                  </p>
                  <p>
                    <strong>{copy.admin.reviewedLabel}:</strong>{" "}
                    {formatDateTime(selectedSubmission.reviewedAt, toIntlLocale(locale), copy.admin.notReviewedYet)}
                  </p>
                  {selectedSubmission.rejectReason ? (
                    <p>
                      <strong>{copy.admin.rejectReasonLabel}:</strong> {selectedSubmission.rejectReason}
                    </p>
                  ) : null}
                </div>

                <div className="form-field">
                  <span className="form-label">{copy.admin.publicTagsLabel}</span>
                  <span className="form-help">{copy.admin.publicTagsHelp(maxSelectedTagsPerSubmission)}</span>
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
                        disabled={isSubmittingAction}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                  {selectedSubmission.tags.length > 0 ? (
                    <div className="selected-tag-list">
                      {selectedSubmission.tags.map((tag) => (
                        <span
                          key={tag.slug}
                          className={`selected-tag-chip ${getScopeLevelClassName(tag.scopeLevel)}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="form-help">{copy.admin.noPublicTagsSaved}</p>
                  )}
                  <div className="actions">
                    <button
                      className="button-link secondary"
                      type="button"
                      onClick={handleSaveTags}
                      disabled={isSubmittingAction}
                    >
                      {copy.admin.saveTags}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <span className="form-label">{copy.admin.privateSuggestedTagsLabel}</span>
                  <span className="form-help">{copy.admin.privateSuggestedTagsHelp}</span>
                  {selectedSubmission.rawTags.length > 0 ? (
                    <div className="selected-tag-list">
                      {selectedSubmission.rawTags.map((rawTag) => (
                        <span key={rawTag.id} className="selected-tag-chip raw-tag-chip">
                          {rawTag.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="form-help">{copy.admin.noPrivateSuggestedTags}</p>
                  )}
                </div>

                {selectedSubmission.status === "pending" ? (
                  <label className="form-field">
                    <span className="form-label">{copy.admin.rejectReasonLabel}</span>
                    <textarea
                      className="form-input form-textarea"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder={copy.admin.rejectReasonPlaceholder}
                      disabled={isSubmittingAction}
                    />
                  </label>
                ) : null}

                <div className="actions">
                  <button
                    className="button-link secondary"
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isSubmittingAction}
                  >
                    {copy.admin.downloadZip}
                  </button>

                  {selectedSubmission.status === "pending" ? (
                    <button
                      className="button-link"
                      type="button"
                      onClick={handleApprove}
                      disabled={isSubmittingAction}
                    >
                      {copy.admin.approve}
                    </button>
                  ) : null}

                  {selectedSubmission.status === "pending" ? (
                    <button
                      className="button-link secondary"
                      type="button"
                      onClick={handleReject}
                      disabled={isSubmittingAction}
                    >
                      {copy.admin.reject}
                    </button>
                  ) : null}

                  <button
                    className="button-link secondary destructive-button"
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmittingAction}
                  >
                    {copy.admin.delete}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
