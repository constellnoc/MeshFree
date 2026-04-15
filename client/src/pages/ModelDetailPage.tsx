import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getApprovedModelDetail } from "../api/models";
import type { ModelDetail } from "../types/model";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ModelDetailPage() {
  const { id = "" } = useParams();
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  if (isLoading) {
    return (
      <section className="page-grid">
        <div className="card">
          <h2>Loading model</h2>
          <p>The client is requesting `/api/models/{id || ":id"}`.</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !model) {
    return (
      <section className="page-grid">
        <div className="card">
          <h2>Model unavailable</h2>
          <p>{errorMessage || "Model not found."}</p>
          <Link className="button-link" to="/">
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid detail-grid">
      <div className="card detail-cover-card">
        <img src={model.coverImageUrl} alt={model.title} className="detail-cover" />
      </div>

      <div className="card detail-card">
        <p className="section-kicker">Model Detail</p>
        <h2>{model.title}</h2>
        <p>{model.description}</p>
        <p className="model-date">Created {formatDate(model.createdAt)}</p>
        <div className="actions">
          <a className="button-link" href={`/api/models/${model.id}/download`}>
            Download ZIP
          </a>
          <Link className="button-link secondary" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
