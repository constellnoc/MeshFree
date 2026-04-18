import { useEffect, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";

import { getApprovedModels } from "../api/models";
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
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await getApprovedModels();
        setModels(data);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(`Failed to load approved models: ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    void loadModels();
  }, []);

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
          <p className="section-kicker">MeshFree MVP</p>
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
            This section shows approved submissions from the backend. Visitors
            can open detail pages and download the ZIP files without logging in.
          </p>
        </div>
        <div className="actions">
          <Link className="button-link secondary" to="/upload">
            Upload a model
          </Link>
        </div>
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
          <h2>No approved models yet</h2>
          <p>
            The public gallery is empty right now. Once approved submissions exist,
            they will appear here automatically.
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
