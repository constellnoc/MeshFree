import { Fragment, Suspense, lazy, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getApprovedModelDetail } from "../api/models";
import { useLanguage } from "../contexts/LanguageContext";
import { toIntlLocale } from "../lib/i18n";
import { getScopeLevelClassName } from "../lib/tags";
import type { ModelDetail } from "../types/model";

const LazyModelPreviewViewer = lazy(() => import("../components/ModelPreviewViewer"));

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ModelDetailPageProps {
  presentation?: "page" | "modal";
}

export function ModelDetailPage({ presentation = "page" }: ModelDetailPageProps) {
  const { locale, copy } = useLanguage();
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
        setErrorMessage(copy.modelDetail.notFound);
        setIsLoading(false);
        return;
      }

      try {
        const data = await getApprovedModelDetail(id, locale);
        setModel(data);
        setErrorMessage("");
      } catch (error) {
        setModel(null);
        setErrorMessage(copy.modelDetail.failedLoad(String(error)));
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    void loadModelDetail();
  }, [copy.modelDetail.notFound, id, locale]);

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
          <h2>{copy.modelDetail.loadingTitle}</h2>
          <p>{copy.modelDetail.loadingBody(id)}</p>
        </div>
      </section>
    );

    return isModal ? (
      <div className="detail-modal-overlay" onClick={handleClose}>
        <div className="detail-modal-shell" onClick={(event) => event.stopPropagation()}>
          <button
            className="detail-modal-close"
            type="button"
            onClick={handleClose}
            aria-label={copy.modelDetail.closePreviewAriaLabel}
          >
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
          <h2>{copy.modelDetail.unavailableTitle}</h2>
          <p>{errorMessage || copy.modelDetail.notFound}</p>
          {!isModal ? (
            <Link className="button-link" to="/">
              {copy.modelDetail.backToHome}
            </Link>
          ) : null}
        </div>
      </section>
    );

    return isModal ? (
      <div className="detail-modal-overlay" onClick={handleClose}>
        <div className="detail-modal-shell" onClick={(event) => event.stopPropagation()}>
          <button
            className="detail-modal-close"
            type="button"
            onClick={handleClose}
            aria-label={copy.modelDetail.closePreviewAriaLabel}
          >
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
                {copy.modelDetail.preview}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card detail-card">
        <p className="section-kicker">{isModal ? copy.modelDetail.modalKicker : copy.modelDetail.pageKicker}</p>
        <h2>{model.title}</h2>
        <div className={isModal ? "detail-description detail-description-scroll" : "detail-description"}>
          <p>{model.description}</p>
        </div>
        {model.tags.length > 0 ? (
          <div className="selected-tag-list model-tag-list">
            {model.tags.map((tag) => (
              <Link
                key={tag.slug}
                className={`selected-tag-chip ${getScopeLevelClassName(tag.scopeLevel)}`}
                to={`/?tag=${encodeURIComponent(tag.slug)}#gallery`}
              >
                {tag.label}
              </Link>
            ))}
          </div>
        ) : null}
        <p className="model-date">{copy.modelDetail.createdOn(formatDate(model.createdAt, toIntlLocale(locale)))}</p>
        <div className="actions">
          <a className="button-link" href={`/api/models/${model.id}/download`}>
            {copy.modelDetail.downloadZip}
          </a>
          {!isModal ? (
            <Link className="button-link secondary" to="/">
              {copy.modelDetail.backToHome}
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
                    <p>{copy.modelDetail.preparingPreview}</p>
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
          <button
            className="detail-modal-close"
            type="button"
            onClick={handleClose}
            aria-label={copy.modelDetail.closePreviewAriaLabel}
          >
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
                  <p>{copy.modelDetail.preparingPreview}</p>
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
