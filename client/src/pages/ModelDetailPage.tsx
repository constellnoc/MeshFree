import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getModelDetailPlaceholder } from "../api/models";

export function ModelDetailPage() {
  const { id = "1" } = useParams();
  const [responseText, setResponseText] = useState(`Loading /api/models/${id} ...`);

  useEffect(() => {
    const loadModelDetail = async () => {
      try {
        const data = await getModelDetailPlaceholder(id);
        setResponseText(JSON.stringify(data, null, 2));
      } catch (error) {
        setResponseText(`Request failed: ${String(error)}`);
      }
    };

    void loadModelDetail();
  }, [id]);

  return (
    <section className="page-grid">
      <div className="card">
        <h2>Model Detail Page</h2>
        <p>This page is the placeholder for `/models/:id`.</p>
        <p>
          Current route param: <strong>{id}</strong>
        </p>
        <Link className="button-link" to="/">
          Back to home
        </Link>
      </div>

      <div className="card">
        <h2>Placeholder Response</h2>
        <pre>{responseText}</pre>
      </div>
    </section>
  );
}
