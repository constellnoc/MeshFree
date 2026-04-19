import { Fragment, Suspense, lazy, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getApprovedModelDetail } from "../api/models";
import type { ModelDetail } from "../types/model";

const LazyModelPreviewViewer = lazy(() => import("../components/ModelPreviewViewer"));

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ModelDetailPageProps {
  presentation?: "page" | "modal";
}

export function ModelDetailPage({ presentation = "page" }: ModelDetailPageProps) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const isModal = presentation === "modal";

  useEffect(() => {
    const loadModelDetail = async () => {
      if (!id) {
        setErrorMessage("Model not found.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await getApprovedModelDetail(id);
        setModel(data);
        setErrorMessage("");
      } catch (error) {
        setModel(null);
        setErrorMessage(`Failed to load model detail: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    void loadModelDetail();
  }, [id]);

  useEffect(() => {
    setIsViewerOpen(false);
  }, [id]);

  useEffect(() => {
    if (!isModal && !isViewerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isViewerOpen) {
          setIsViewerOpen(false);
          return;
        }

        navigate(-1);
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModal, isViewerOpen, navigate]);

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/#gallery", { replace: true });
  };

  if (isLoading) {
    const loadingContent = (
      <section className={isModal ? "page-grid modal-detail-grid" : "page-grid"}>
        <div className="card">
          <h2>Loading model</h2>
          <p>The client is requesting `/api/models/{id || ":id"}`.</p>
        </div>
      </section>
    );

    return isModal ? (
      <div className="detail-modal-overlay" onClick={handleClose}>
        <div className="detail-modal-shell" onClick={(event) => event.stopPropagation()}>
          <button className="detail-modal-close" type="button" onClick={handleClose} aria-label="Close model preview">
            <span className="detail-modal-close-icon" aria-hidden="true" />
          </button>
          {loadingContent}
        </div>
      </div>
    ) : (
      loadingContent
    );
  }

  if (errorMessage || !model) {
    const errorContent = (
      <section className={isModal ? "page-grid modal-detail-grid" : "page-grid"}>
        <div className="card">
          <h2>Model unavailable</h2>
          <p>{errorMessage || "Model not found."}</p>
          {!isModal ? (
            <Link className="button-link" to="/">
              Back to home
            </Link>
          ) : null}
        </div>
      </section>
    );

    return isModal ? (
      <div className="detail-modal-overlay" onClick={handleClose}>
        <div className="detail-modal-shell" onClick={(event) => event.stopPropagation()}>
          <button className="detail-modal-close" type="button" onClick={handleClose} aria-label="Close model preview">
            <span className="detail-modal-close-icon" aria-hidden="true" />
          </button>
          {errorContent}
        </div>
      </div>
    ) : (
      errorContent
    );
  }

  const detailContent = (
    <section className={isModal ? "page-grid detail-grid detail-grid-modal" : "page-grid detail-grid"}>
      <div className="card detail-cover-card">
        <div className="detail-preview-surface">
          <img src={model.coverImageUrl} alt={model.title} className="detail-cover" />
          {model.previewModelUrl ? (
            <div className="detail-preview-overlay">
              <button className="detail-preview-trigger" type="button" onClick={() => setIsViewerOpen(true)}>
                Preview
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card detail-card">
        <p className="section-kicker">{isModal ? "Model Preview" : "Model Detail"}</p>
        <h2>{model.title}</h2>
        <div className={isModal ? "detail-description detail-description-scroll" : "detail-description"}>
          <p>{model.description}</p>
        </div>
        <p className="model-date">Created {formatDate(model.createdAt)}</p>
        <div className="actions">
          <a className="button-link" href={`/api/models/${model.id}/download`}>
            Download ZIP
          </a>
          {!isModal ? (
            <Link className="button-link secondary" to="/">
              Back to home
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );

  if (!isModal) {
    return (
      <>
        {detailContent}
        {isViewerOpen && model.previewModelUrl ? (
          <div className="viewer-modal-overlay" onClick={() => setIsViewerOpen(false)}>
            <div className="viewer-modal-content" onClick={(event) => event.stopPropagation()}>
              <Suspense
                fallback={
                  <div className="viewer-modal-loading" role="status" aria-live="polite">
                    <p>Preparing 3D preview...</p>
                  </div>
                }
              >
                <LazyModelPreviewViewer modelUrl={model.previewModelUrl} title={model.title} onClose={() => setIsViewerOpen(false)} />
              </Suspense>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <Fragment>
      <div className="detail-modal-overlay" onClick={handleClose}>
        <div className="detail-modal-shell" onClick={(event) => event.stopPropagation()}>
          <button className="detail-modal-close" type="button" onClick={handleClose} aria-label="Close model preview">
            <span className="detail-modal-close-icon" aria-hidden="true" />
          </button>
          {detailContent}
        </div>
      </div>

      {isViewerOpen && model.previewModelUrl ? (
        <div className="viewer-modal-overlay" onClick={() => setIsViewerOpen(false)}>
          <div className="viewer-modal-content" onClick={(event) => event.stopPropagation()}>
            <Suspense
              fallback={
                <div className="viewer-modal-loading" role="status" aria-live="polite">
                  <p>Preparing 3D preview...</p>
                </div>
              }
            >
              <LazyModelPreviewViewer modelUrl={model.previewModelUrl} title={model.title} onClose={() => setIsViewerOpen(false)} />
            </Suspense>
          </div>
        </div>
      ) : null}
    </Fragment>
  );
}
