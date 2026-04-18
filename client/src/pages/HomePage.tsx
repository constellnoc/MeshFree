import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <section className="page-stack">
      <div className="card hero-card">
        <p className="section-kicker">Public Models</p>
        <h2>Browse approved model resources</h2>
        <p>
          This page shows only approved submissions from the backend. Visitors can
          open a detail page and download the ZIP file without logging in.
        </p>
        <div className="actions">
          <Link className="button-link secondary" to="/submit">
            Submit a new model
          </Link>
        </div>
      </div>

      <div id="gallery" className="gallery-anchor">
        <p className="section-kicker">Gallery</p>
        <h2>Approved model resources</h2>
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
