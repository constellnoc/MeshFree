import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  approveSubmission,
  clearAdminToken,
  getAdminSubmissionDetail,
  getAdminSubmissions,
  getAdminToken,
  rejectSubmission,
  deleteSubmission,
} from "../api/admin";
import type { AdminSubmissionDetail, AdminSubmissionStatus, AdminSubmissionSummary } from "../types/admin";

type SubmissionFilter = "all" | AdminSubmissionStatus;

const filterOptions: SubmissionFilter[] = ["pending", "approved", "rejected", "all"];

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return "Not reviewed yet";
  }

  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDashboardErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Request failed. Please try again.";
  }

  return error instanceof Error ? error.message : "Request failed. Please try again.";
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SubmissionFilter>("pending");
  const [submissions, setSubmissions] = useState<AdminSubmissionSummary[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionDetail | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const selectedSummary = useMemo(
    () => submissions.find((submission) => submission.id === selectedSubmissionId) ?? null,
    [selectedSubmissionId, submissions],
  );

  const handleUnauthorized = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  const loadSubmissions = async (preferredSubmissionId?: number | null) => {
    if (!getAdminToken()) {
      handleUnauthorized();
      return;
    }

    setIsLoadingList(true);
    setErrorMessage("");

    try {
      const result = await getAdminSubmissions(filter === "all" ? undefined : filter);
      setSubmissions(result);

      const nextSelectedId =
        preferredSubmissionId && result.some((submission) => submission.id === preferredSubmissionId)
          ? preferredSubmissionId
          : result[0]?.id ?? null;

      setSelectedSubmissionId(nextSelectedId);

      if (!nextSelectedId) {
        setSelectedSubmission(null);
        setRejectReason("");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    void loadSubmissions(selectedSubmissionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const loadSubmissionDetail = async () => {
      if (!selectedSubmissionId) {
        setSelectedSubmission(null);
        setRejectReason("");
        return;
      }

      setIsLoadingDetail(true);

      try {
        const detail = await getAdminSubmissionDetail(selectedSubmissionId);
        setSelectedSubmission(detail);
        setRejectReason(detail.rejectReason ?? "");
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleUnauthorized();
          return;
        }

        setErrorMessage(getDashboardErrorMessage(error));
      } finally {
        setIsLoadingDetail(false);
      }
    };

    void loadSubmissionDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubmissionId]);

  const handleLogout = () => {
    clearAdminToken();
    navigate("/admin/login");
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

      setErrorMessage(getDashboardErrorMessage(error));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) {
      return;
    }

    if (!rejectReason.trim()) {
      setErrorMessage("Please enter a reject reason before rejecting.");
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

  return (
    <section className="page-grid admin-grid">
      <div className="card">
        <div className="admin-toolbar">
          <div>
            <p className="section-kicker">Admin Dashboard</p>
            <h2>Review submissions</h2>
            <p>Select a record to inspect it and update its review status.</p>
          </div>
          <button className="button-link secondary" type="button" onClick={handleLogout}>
            Log out
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
              {option === "all" ? "All" : option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>

        {isLoadingList ? <p>Loading submissions...</p> : null}

        {!isLoadingList && submissions.length === 0 ? (
          <p>No submissions match the current filter.</p>
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
                    {submission.status}
                  </span>
                </div>
                <p>{submission.description}</p>
                <p className="admin-submission-meta">
                  Created {formatDateTime(submission.createdAt)}
                </p>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="card">
        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="form-message success-message">{successMessage}</p> : null}

        {!selectedSummary && !isLoadingList ? (
          <div>
            <h2>No submission selected</h2>
            <p>Choose an item from the list to inspect its details.</p>
          </div>
        ) : null}

        {selectedSummary ? (
          <div className="admin-detail">
            <p className="section-kicker">Submission Detail</p>
            <h2>{selectedSummary.title}</h2>
            <p>{selectedSummary.description}</p>

            {isLoadingDetail ? <p>Loading selected submission...</p> : null}

            {selectedSubmission && !isLoadingDetail ? (
              <>
                <img
                  src={selectedSubmission.coverImageUrl}
                  alt={selectedSubmission.title}
                  className="admin-detail-cover"
                />

                <div className="admin-detail-meta">
                  <p>
                    <strong>Status:</strong> {selectedSubmission.status}
                  </p>
                  <p>
                    <strong>Contact:</strong> {selectedSubmission.contact}
                  </p>
                  <p>
                    <strong>ZIP file:</strong> {selectedSubmission.modelZipName}
                  </p>
                  <p>
                    <strong>Created:</strong> {formatDateTime(selectedSubmission.createdAt)}
                  </p>
                  <p>
                    <strong>Reviewed:</strong> {formatDateTime(selectedSubmission.reviewedAt)}
                  </p>
                  {selectedSubmission.rejectReason ? (
                    <p>
                      <strong>Reject reason:</strong> {selectedSubmission.rejectReason}
                    </p>
                  ) : null}
                </div>

                {selectedSubmission.status === "pending" ? (
                  <label className="form-field">
                    <span className="form-label">Reject reason</span>
                    <textarea
                      className="form-input form-textarea"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Explain why this submission should be rejected."
                      disabled={isSubmittingAction}
                    />
                  </label>
                ) : null}

                <div className="actions">
                  {selectedSubmission.status === "pending" ? (
                    <button
                      className="button-link"
                      type="button"
                      onClick={handleApprove}
                      disabled={isSubmittingAction}
                    >
                      Approve
                    </button>
                  ) : null}

                  {selectedSubmission.status === "pending" ? (
                    <button
                      className="button-link secondary"
                      type="button"
                      onClick={handleReject}
                      disabled={isSubmittingAction}
                    >
                      Reject
                    </button>
                  ) : null}

                  <button
                    className="button-link secondary destructive-button"
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmittingAction}
                  >
                    Delete
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
