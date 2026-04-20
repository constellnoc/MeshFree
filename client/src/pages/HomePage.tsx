import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { getApprovedModels } from "../api/models";
import { recommendedTags } from "../lib/tags";
import type { ModelSummary } from "../types/model";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function HomePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [searchInput, setSearchInput] = useState("");

  const activeQuery = searchParams.get("q")?.trim() ?? "";
  const activeTag = searchParams.get("tag")?.trim() ?? "";

  useEffect(() => {
    setSearchInput(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);

      try {
        const data = await getApprovedModels({
          ...(activeQuery ? { q: activeQuery } : {}),
          ...(activeTag ? { tag: activeTag } : {}),
        });
        setModels(data);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(`Failed to load approved models: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadModels();
  }, [activeQuery, activeTag]);

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

  const updateFilters = (nextQuery: string, nextTag: string) => {
    const nextParams = new URLSearchParams();
    const trimmedQuery = nextQuery.trim();
    const trimmedTag = nextTag.trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    if (trimmedTag) {
      nextParams.set("tag", trimmedTag);
    }

    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilters(searchInput, activeTag);
  };

  const handleTagFilterToggle = (tag: string) => {
    updateFilters(activeQuery, activeTag === tag ? "" : tag);
  };

  const handleClearFilters = () => {
    setSearchInput("");
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
          <h1>Open resources, open creativity.</h1>
          <p className="hero-lead">
            MeshFree is a lightweight platform for browsing, sharing, and
            reviewing 3D model resources.
          </p>
          <div className="actions hero-actions">
            <Link className="button-link" to="/#gallery">
              Browse gallery
            </Link>
            <Link className="button-link secondary" to="/upload">
              Upload
            </Link>
          </div>
        </div>
      </section>

      <div id="gallery" className="gallery-anchor gallery-anchor-enhanced">
        <div className="gallery-anchor-copy">
          <p className="section-kicker">Gallery</p>
          <h2>Approved model resources</h2>
          <p>
            Search by keyword, browse recommended tags, and open approved resources without
            logging in.
          </p>
        </div>
        <div className="actions">
          <Link className="button-link secondary" to="/upload">
            Upload a model
          </Link>
        </div>
      </div>

      <div className="card">
        <form className="search-panel" onSubmit={handleSearchSubmit}>
          <div className="search-panel-row">
            <label className="form-field search-panel-field">
              <span className="form-label">Search by title, description, or tag</span>
              <input
                className="form-input"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Try low-poly, temple, environment..."
              />
            </label>
            <div className="search-panel-actions">
              <button className="button-link" type="submit">
                Search
              </button>
              {activeQuery || activeTag ? (
                <button className="button-link secondary" type="button" onClick={handleClearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="tag-chip-list">
            {recommendedTags.map((tag) => (
              <button
                key={tag}
                className={activeTag === tag ? "tag-chip tag-chip-active" : "tag-chip"}
                type="button"
                onClick={() => handleTagFilterToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {activeQuery || activeTag ? (
            <p className="search-result-summary">
              Showing results
              {activeQuery ? ` for "${activeQuery}"` : ""}
              {activeTag ? ` in tag "${activeTag}"` : ""}.
            </p>
          ) : null}
        </form>
      </div>

      {isLoading ? (
        <div className="card">
          <h2>Loading models</h2>
          <p>The client is requesting `/api/models` from the backend.</p>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="card">
          <h2>Unable to load models</h2>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && models.length === 0 ? (
        <div className="card">
          <h2>{activeQuery || activeTag ? "No matching models" : "No approved models yet"}</h2>
          <p>
            {activeQuery || activeTag
              ? "Try a different keyword or remove the active tag filter."
              : "The public gallery is empty right now. Once approved submissions exist, they will appear here automatically."}
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
                <p className="model-date">Approved resource</p>
                <h2>{model.title}</h2>
                <p>{model.description}</p>
                {model.tags.length > 0 ? (
                  <div className="selected-tag-list model-tag-list">
                    {model.tags.map((tag) => (
                      <button
                        key={tag}
                        className={activeTag === tag ? "selected-tag-chip selected-tag-chip-active" : "selected-tag-chip"}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          handleTagFilterToggle(tag);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                <span className="model-link">View details and download</span>
                <p className="model-date">Created {formatDate(model.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
