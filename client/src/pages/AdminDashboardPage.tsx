import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  approveSubmission,
  createAdminTag,
  createAdminTagFromRawTag,
  clearAdminToken,
  downloadAdminSubmissionZip,
  getAdminSubmissionDetail,
  getAdminSubmissions,
  getAdminToken,
  ignoreAdminRawTag,
  rejectSubmission,
  resolveAdminRawTagToExisting,
  deleteSubmission,
  updateSubmissionTags,
} from "../api/admin";
import { getPublicTags } from "../api/tags";
import { useLanguage } from "../contexts/LanguageContext";
import { toIntlLocale } from "../lib/i18n";
import { getScopeLevelClassName, maxSelectedTagsPerSubmission } from "../lib/tags";
import type { AdminSubmissionDetail, AdminSubmissionStatus, AdminSubmissionSummary } from "../types/admin";
import type { ManagedTagPayload, PublicTag, TagScopeLevel } from "../types/tag";

type SubmissionFilter = "all" | AdminSubmissionStatus;
type RawTagActionMode = "resolve" | "create";

const filterOptions: SubmissionFilter[] = ["pending", "approved", "rejected", "all"];
const tagScopeOrder: Record<TagScopeLevel, number> = {
  broad: 0,
  medium: 1,
  specific: 2,
};

function createEmptyManagedTagPayload(): ManagedTagPayload {
  return {
    slug: "",
    displayNameEn: "",
    displayNameZh: "",
    scopeLevel: "medium",
  };
}

function createManagedTagPayloadFromRawValue(rawValue: string): ManagedTagPayload {
  const trimmedValue = rawValue.trim();

  return {
    slug: trimmedValue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    displayNameEn: trimmedValue,
    displayNameZh: trimmedValue,
    scopeLevel: "medium",
  };
}

function sortAvailableTags(tags: PublicTag[]) {
  return [...tags].sort((left, right) => {
    const scopeDifference = tagScopeOrder[left.scopeLevel] - tagScopeOrder[right.scopeLevel];

    if (scopeDifference !== 0) {
      return scopeDifference;
    }

    return left.label.localeCompare(right.label);
  });
}

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
  const [isCreateTagFormOpen, setIsCreateTagFormOpen] = useState(false);
  const [managedTagForm, setManagedTagForm] = useState<ManagedTagPayload>(() => createEmptyManagedTagPayload());
  const [activeRawTagAction, setActiveRawTagAction] = useState<{
    rawTagId: number;
    mode: RawTagActionMode;
  } | null>(null);
  const [activeRawTagTargetSlug, setActiveRawTagTargetSlug] = useState("");
  const [activeRawTagManagedTagForm, setActiveRawTagManagedTagForm] = useState<ManagedTagPayload>(() =>
    createEmptyManagedTagPayload(),
  );
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
      case "Admin tag created successfully.":
        return copy.admin.successTagCreated;
      case "Custom tag ignored successfully.":
        return copy.admin.successRawTagIgnored;
      case "Custom tag resolved successfully.":
        return copy.admin.successRawTagResolved;
      case "Custom tag converted successfully.":
        return copy.admin.successRawTagConverted;
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
        setAvailableTags(sortAvailableTags(tags));
      } catch (error) {
        setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
      }
    };

    void loadAvailableTags();
  }, [copy.admin.requestFailed, locale]);

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
        setIsCreateTagFormOpen(false);
        setManagedTagForm(createEmptyManagedTagPayload());
        setActiveRawTagAction(null);
        setActiveRawTagTargetSlug("");
        setActiveRawTagManagedTagForm(createEmptyManagedTagPayload());
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

  const applyUpdatedSubmission = (submission: AdminSubmissionDetail) => {
    setSelectedSubmission(submission);
    setSelectedTagSlugs(submission.tags.map((tag) => tag.slug));
  };

  const handleManagedTagFormChange = <K extends keyof ManagedTagPayload>(key: K, value: ManagedTagPayload[K]) => {
    setManagedTagForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const handleActiveRawTagManagedTagFormChange = <K extends keyof ManagedTagPayload>(
    key: K,
    value: ManagedTagPayload[K],
  ) => {
    setActiveRawTagManagedTagForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const openResolveRawTag = (rawTagId: number) => {
    setActiveRawTagAction({
      rawTagId,
      mode: "resolve",
    });
    setActiveRawTagTargetSlug("");
    setActiveRawTagManagedTagForm(createEmptyManagedTagPayload());
  };

  const openCreateTagFromRawTag = (rawTagId: number, rawValue: string) => {
    setActiveRawTagAction({
      rawTagId,
      mode: "create",
    });
    setActiveRawTagTargetSlug("");
    setActiveRawTagManagedTagForm(createManagedTagPayloadFromRawValue(rawValue));
  };

  const closeRawTagAction = () => {
    setActiveRawTagAction(null);
    setActiveRawTagTargetSlug("");
    setActiveRawTagManagedTagForm(createEmptyManagedTagPayload());
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

  const handleCreateAdminTag = async () => {
    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await createAdminTag(managedTagForm, locale);
      setAvailableTags((currentTags) => sortAvailableTags([...currentTags, result.tag]));
      setSuccessMessage(result.message);
      setManagedTagForm(createEmptyManagedTagPayload());
      setIsCreateTagFormOpen(false);
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

  const handleIgnoreRawTag = async (rawTagId: number) => {
    if (!selectedSubmission) {
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await ignoreAdminRawTag(rawTagId, locale);
      applyUpdatedSubmission(result.submission);
      setSuccessMessage(result.message);
      closeRawTagAction();
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

  const handleResolveRawTagToExisting = async (rawTagId: number) => {
    if (!selectedSubmission) {
      return;
    }

    if (!activeRawTagTargetSlug) {
      setErrorMessage(copy.admin.requiredResolveTag);
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await resolveAdminRawTagToExisting(rawTagId, activeRawTagTargetSlug, locale);
      applyUpdatedSubmission(result.submission);
      setSuccessMessage(result.message);
      closeRawTagAction();
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

  const handleCreateTagFromRawTag = async (rawTagId: number) => {
    if (!selectedSubmission) {
      return;
    }

    setIsSubmittingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await createAdminTagFromRawTag(rawTagId, activeRawTagManagedTagForm, locale);
      applyUpdatedSubmission(result.submission);
      setAvailableTags((currentTags) => {
        const nextTag = result.submission.rawTags.find((rawTag) => rawTag.id === rawTagId)?.resolvedTag;

        return nextTag
          ? sortAvailableTags([...currentTags.filter((tag) => tag.slug !== nextTag.slug), nextTag])
          : currentTags;
      });
      setSuccessMessage(result.message);
      closeRawTagAction();
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

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
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

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
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

      setErrorMessage(getDashboardErrorMessage(error, copy.admin.requestFailed));
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
                  {selectedTagSlugs.length > 0 ? (
                    <div className="selected-tag-list" aria-live="polite">
                      {selectedTagSlugs.map((tagSlug) => {
                        const matchingTag = availableTags.find((tag) => tag.slug === tagSlug);

                        if (!matchingTag) {
                          return null;
                        }

                        return (
                          <button
                            key={matchingTag.slug}
                            className={[
                              "selected-tag-chip",
                              getScopeLevelClassName(matchingTag.scopeLevel),
                              "selected-tag-chip-active",
                            ].join(" ")}
                            type="button"
                            onClick={() => handleToggleSelectedTag(matchingTag.slug)}
                            disabled={isSubmittingAction}
                          >
                            {matchingTag.label}
                            <span aria-hidden="true"> ×</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="form-help">{copy.admin.noPublicTagsSaved}</p>
                  )}
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
                  <div className="actions">
                    <button
                      className="button-link secondary"
                      type="button"
                      onClick={handleSaveTags}
                      disabled={isSubmittingAction}
                    >
                      {copy.admin.saveTags}
                    </button>
                    <button
                      className="button-link secondary"
                      type="button"
                      onClick={() => {
                        setIsCreateTagFormOpen((currentValue) => !currentValue);
                        setManagedTagForm(createEmptyManagedTagPayload());
                      }}
                      disabled={isSubmittingAction}
                    >
                      {copy.admin.createTagToggle}
                    </button>
                  </div>
                  {isCreateTagFormOpen ? (
                    <div className="admin-inline-form">
                      <p className="form-label">{copy.admin.createTagSectionTitle}</p>
                      <p className="form-help">{copy.admin.createTagSectionLead}</p>
                      <label className="form-field">
                        <span className="form-label">{copy.admin.tagSlugLabel}</span>
                        <input
                          className="form-input"
                          type="text"
                          value={managedTagForm.slug}
                          onChange={(event) => handleManagedTagFormChange("slug", event.target.value)}
                          placeholder={copy.admin.tagSlugPlaceholder}
                          disabled={isSubmittingAction}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">{copy.admin.tagNameEnLabel}</span>
                        <input
                          className="form-input"
                          type="text"
                          value={managedTagForm.displayNameEn}
                          onChange={(event) => handleManagedTagFormChange("displayNameEn", event.target.value)}
                          placeholder={copy.admin.tagNameEnPlaceholder}
                          disabled={isSubmittingAction}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">{copy.admin.tagNameZhLabel}</span>
                        <input
                          className="form-input"
                          type="text"
                          value={managedTagForm.displayNameZh}
                          onChange={(event) => handleManagedTagFormChange("displayNameZh", event.target.value)}
                          placeholder={copy.admin.tagNameZhPlaceholder}
                          disabled={isSubmittingAction}
                        />
                      </label>
                      <label className="form-field">
                        <span className="form-label">{copy.admin.tagScopeLabel}</span>
                        <select
                          className="form-input"
                          value={managedTagForm.scopeLevel}
                          onChange={(event) =>
                            handleManagedTagFormChange("scopeLevel", event.target.value as TagScopeLevel)
                          }
                          disabled={isSubmittingAction}
                        >
                          <option value="broad">{copy.admin.tagScopeValues.broad}</option>
                          <option value="medium">{copy.admin.tagScopeValues.medium}</option>
                          <option value="specific">{copy.admin.tagScopeValues.specific}</option>
                        </select>
                      </label>
                      <div className="actions">
                        <button
                          className="button-link"
                          type="button"
                          onClick={handleCreateAdminTag}
                          disabled={isSubmittingAction}
                        >
                          {copy.admin.createTagSubmit}
                        </button>
                        <button
                          className="button-link secondary"
                          type="button"
                          onClick={() => {
                            setIsCreateTagFormOpen(false);
                            setManagedTagForm(createEmptyManagedTagPayload());
                          }}
                          disabled={isSubmittingAction}
                        >
                          {copy.admin.cancelRawTagAction}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="form-field">
                  <span className="form-label">{copy.admin.privateSuggestedTagsLabel}</span>
                  <span className="form-help">{copy.admin.privateSuggestedTagsHelp}</span>
                  {selectedSubmission.rawTags.length > 0 ? (
                    <div className="admin-raw-tag-list">
                      {selectedSubmission.rawTags.map((rawTag) => (
                        <div key={rawTag.id} className="admin-raw-tag-card">
                          <div className="admin-raw-tag-header">
                            <span className="selected-tag-chip raw-tag-chip">{rawTag.value}</span>
                            <span className={`status-badge admin-raw-tag-status admin-raw-tag-status-${rawTag.status}`}>
                              {copy.admin.rawTagStatusValues[rawTag.status]}
                            </span>
                          </div>
                          {rawTag.resolvedTag ? (
                            <p className="form-help">
                              {copy.admin.resolvedToLabel}: {rawTag.resolvedTag.label}
                            </p>
                          ) : null}
                          <div className="actions admin-raw-tag-actions">
                            <button
                              className="button-link secondary"
                              type="button"
                              onClick={() => openResolveRawTag(rawTag.id)}
                              disabled={isSubmittingAction}
                            >
                              {copy.admin.resolveToExisting}
                            </button>
                            <button
                              className="button-link secondary"
                              type="button"
                              onClick={() => openCreateTagFromRawTag(rawTag.id, rawTag.value)}
                              disabled={isSubmittingAction}
                            >
                              {copy.admin.createFromRawTag}
                            </button>
                            {rawTag.status !== "ignored" ? (
                              <button
                                className="button-link secondary"
                                type="button"
                                onClick={() => handleIgnoreRawTag(rawTag.id)}
                                disabled={isSubmittingAction}
                              >
                                {copy.admin.ignoreRawTag}
                              </button>
                            ) : null}
                          </div>
                          {activeRawTagAction?.rawTagId === rawTag.id && activeRawTagAction.mode === "resolve" ? (
                            <div className="admin-inline-form">
                              <label className="form-field">
                                <span className="form-label">{copy.admin.resolveSelectLabel}</span>
                                <select
                                  className="form-input"
                                  value={activeRawTagTargetSlug}
                                  onChange={(event) => setActiveRawTagTargetSlug(event.target.value)}
                                  disabled={isSubmittingAction}
                                >
                                  <option value="">{copy.admin.resolveSelectPlaceholder}</option>
                                  {availableTags.map((tag) => (
                                    <option key={tag.slug} value={tag.slug}>
                                      {tag.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="actions">
                                <button
                                  className="button-link"
                                  type="button"
                                  onClick={() => handleResolveRawTagToExisting(rawTag.id)}
                                  disabled={isSubmittingAction}
                                >
                                  {copy.admin.resolveConfirm}
                                </button>
                                <button
                                  className="button-link secondary"
                                  type="button"
                                  onClick={closeRawTagAction}
                                  disabled={isSubmittingAction}
                                >
                                  {copy.admin.cancelRawTagAction}
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {activeRawTagAction?.rawTagId === rawTag.id && activeRawTagAction.mode === "create" ? (
                            <div className="admin-inline-form">
                              <label className="form-field">
                                <span className="form-label">{copy.admin.tagSlugLabel}</span>
                                <input
                                  className="form-input"
                                  type="text"
                                  value={activeRawTagManagedTagForm.slug}
                                  onChange={(event) =>
                                    handleActiveRawTagManagedTagFormChange("slug", event.target.value)
                                  }
                                  placeholder={copy.admin.tagSlugPlaceholder}
                                  disabled={isSubmittingAction}
                                />
                              </label>
                              <label className="form-field">
                                <span className="form-label">{copy.admin.tagNameEnLabel}</span>
                                <input
                                  className="form-input"
                                  type="text"
                                  value={activeRawTagManagedTagForm.displayNameEn}
                                  onChange={(event) =>
                                    handleActiveRawTagManagedTagFormChange("displayNameEn", event.target.value)
                                  }
                                  placeholder={copy.admin.tagNameEnPlaceholder}
                                  disabled={isSubmittingAction}
                                />
                              </label>
                              <label className="form-field">
                                <span className="form-label">{copy.admin.tagNameZhLabel}</span>
                                <input
                                  className="form-input"
                                  type="text"
                                  value={activeRawTagManagedTagForm.displayNameZh}
                                  onChange={(event) =>
                                    handleActiveRawTagManagedTagFormChange("displayNameZh", event.target.value)
                                  }
                                  placeholder={copy.admin.tagNameZhPlaceholder}
                                  disabled={isSubmittingAction}
                                />
                              </label>
                              <label className="form-field">
                                <span className="form-label">{copy.admin.tagScopeLabel}</span>
                                <select
                                  className="form-input"
                                  value={activeRawTagManagedTagForm.scopeLevel}
                                  onChange={(event) =>
                                    handleActiveRawTagManagedTagFormChange(
                                      "scopeLevel",
                                      event.target.value as TagScopeLevel,
                                    )
                                  }
                                  disabled={isSubmittingAction}
                                >
                                  <option value="broad">{copy.admin.tagScopeValues.broad}</option>
                                  <option value="medium">{copy.admin.tagScopeValues.medium}</option>
                                  <option value="specific">{copy.admin.tagScopeValues.specific}</option>
                                </select>
                              </label>
                              <div className="actions">
                                <button
                                  className="button-link"
                                  type="button"
                                  onClick={() => handleCreateTagFromRawTag(rawTag.id)}
                                  disabled={isSubmittingAction}
                                >
                                  {copy.admin.createTagSubmit}
                                </button>
                                <button
                                  className="button-link secondary"
                                  type="button"
                                  onClick={closeRawTagAction}
                                  disabled={isSubmittingAction}
                                >
                                  {copy.admin.cancelRawTagAction}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
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
