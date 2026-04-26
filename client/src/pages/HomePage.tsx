import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { getApprovedModels } from "../api/models";
import { getPublicTags } from "../api/tags";
import { useLanguage } from "../contexts/LanguageContext";
import { toIntlLocale } from "../lib/i18n";
import { getScopeLevelClassName } from "../lib/tags";
import type { ModelSummary } from "../types/model";
import type { PublicTag } from "../types/tag";

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function HomePage() {
  const { locale, copy } = useLanguage();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [availableTags, setAvailableTags] = useState<PublicTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);

  const activeQuery = searchParams.get("q")?.trim() ?? "";
  const activeTags = useMemo(
    () =>
      searchParams
        .getAll("tag")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [searchParams],
  );
  const activeTagLabels = useMemo(
    () =>
      activeTags.map((activeTag) => availableTags.find((tag) => tag.slug === activeTag)?.label ?? activeTag),
    [activeTags, availableTags],
  );

  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);

      try {
        const data = await getApprovedModels({
          ...(activeQuery ? { q: activeQuery } : {}),
          ...(activeTags.length > 0 ? { tags: activeTags } : {}),
          locale,
        });
        setModels(data);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(copy.home.failedLoad(String(error)));
      } finally {
        setIsLoading(false);
      }
    };

    void loadModels();
  }, [activeQuery, activeTags, locale]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getPublicTags({ locale });
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to load public tags.", error);
      }
    };

    void loadTags();
  }, [locale]);

  useEffect(() => {
    let animationFrameId = 0;

    const updateHeroProgress = () => {
      animationFrameId = 0;

      const viewportHeight = Math.max(window.innerHeight, 1);
      const nextProgress = Math.min(window.scrollY / (viewportHeight * 0.66), 1);

      setHeroScrollProgress((currentProgress) => {
        return Math.abs(currentProgress - nextProgress) < 0.01
          ? currentProgress
          : nextProgress;
      });
    };

    const requestUpdate = () => {
      if (animationFrameId !== 0) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateHeroProgress);
    };

    requestUpdate();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const exitProgress = Math.max((heroScrollProgress - 0.48) / 0.26, 0);
  const heroStyle = {
    "--hero-progress": heroScrollProgress.toFixed(3),
    "--hero-exit": exitProgress.toFixed(3),
    "--hero-opacity-fast": Math.max(1 - exitProgress * exitProgress * 1.85, 0).toFixed(3),
  } as CSSProperties;

  const updateFilters = (nextQuery: string, nextTags: string[]) => {
    const nextParams = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    for (const tag of nextTags) {
      const trimmedTag = tag.trim();

      if (trimmedTag) {
        nextParams.append("tag", trimmedTag);
      }
    }

    setSearchParams(nextParams);
  };

  const handleTagFilterToggle = (tag: string) => {
    updateFilters(
      activeQuery,
      activeTags.includes(tag) ? activeTags.filter((activeTag) => activeTag !== tag) : [...activeTags, tag],
    );
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <section className="page-stack home-page">
      <section id="home-hero" className="hero-shell" style={heroStyle}>
        <div className="hero-geometry" aria-hidden="true">
          <span className="geometry-shape geometry-shape-red-haze" />
          <span className="geometry-shape geometry-shape-yellow-orb" />
          <span className="geometry-shape geometry-shape-blue-disc" />
          <span className="geometry-shape geometry-shape-blue-ring" />
          <span className="geometry-shape geometry-shape-red-bar" />
          <span className="geometry-shape geometry-shape-yellow-chip" />
        </div>

        <div className="hero-copy">
          <h1>{copy.home.heroTitle}</h1>
          <p className="hero-lead">{copy.home.heroLead}</p>
          <div className="actions hero-actions">
            <Link className="button-link" to="/#gallery">
              {copy.home.browseGallery}
            </Link>
            <Link className="button-link secondary" to="/upload">
              {copy.home.upload}
            </Link>
          </div>
        </div>
      </section>

      <div id="gallery" className="gallery-anchor gallery-anchor-enhanced">
        <div className="gallery-anchor-copy">
          <p className="section-kicker">{copy.home.galleryKicker}</p>
          <h2>{copy.home.galleryTitle}</h2>
          <p>{copy.home.galleryLead}</p>
        </div>
        <div className="actions">
          <Link className="button-link secondary" to="/upload">
            {copy.home.uploadModel}
          </Link>
        </div>
      </div>

      <div className="gallery-toolbar">
        <div className="tag-chip-list">
          {availableTags.map((tag) => (
            <button
              key={tag.slug}
              className={[
                "tag-chip",
                getScopeLevelClassName(tag.scopeLevel),
                activeTags.includes(tag.slug) ? "tag-chip-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => handleTagFilterToggle(tag.slug)}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {activeQuery || activeTags.length > 0 ? (
          <div className="gallery-toolbar-meta">
            <p className="search-result-summary">{copy.home.showingResults(activeQuery, activeTags, activeTagLabels)}</p>
            <button className="button-link secondary" type="button" onClick={handleClearFilters}>
              {copy.home.clearFilters}
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="card">
          <h2>{copy.home.loadingTitle}</h2>
          <p>{copy.home.loadingBody}</p>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="card">
          <h2>{copy.home.errorTitle}</h2>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && models.length === 0 ? (
        <div className="card">
          <h2>{activeQuery || activeTags.length > 0 ? copy.home.noMatchingTitle : copy.home.noApprovedTitle}</h2>
          <p>
            {activeQuery || activeTags.length > 0
              ? copy.home.noMatchingBody
              : copy.home.noApprovedBody}
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && models.length > 0 ? (
        <div className="model-grid">
          {models.map((model) => (
            <Link
              key={model.id}
              to={`/models/${model.id}`}
              state={{ backgroundLocation: location }}
              className="card model-card"
            >
              <img
                src={model.coverImageUrl}
                alt={model.title}
                className="model-cover"
              />
              <div className="model-meta">
                <p className="model-date">{copy.home.approvedResource}</p>
                <h2>{model.title}</h2>
                <p>{model.description}</p>
                {model.tags.length > 0 ? (
                  <div className="selected-tag-list model-tag-list">
                    {model.tags.map((tag) => (
                      <button
                        key={tag.slug}
                        className={[
                          "selected-tag-chip",
                          getScopeLevelClassName(tag.scopeLevel),
                          activeTags.includes(tag.slug) ? "selected-tag-chip-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          handleTagFilterToggle(tag.slug);
                        }}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <span className="model-link">{copy.home.viewDetailsAndDownload}</span>
                <p className="model-date">
                  {copy.home.createdOn(formatDate(model.createdAt, toIntlLocale(locale)))}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
