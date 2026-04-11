import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getModelsPlaceholder } from "../api/models";

export function HomePage() {
  const [responseText, setResponseText] = useState("Loading /api/models ...");

  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await getModelsPlaceholder();
        setResponseText(JSON.stringify(data, null, 2));
      } catch (error) {
        setResponseText(`Request failed: ${String(error)}`);
      }
    };

    void loadModels();
  }, []);

  return (
    <section className="page-grid">
      <div className="card">
        <h2>Home Page</h2>
        <p>This page is the placeholder for the public model list.</p>
        <div className="actions">
          <Link className="button-link" to="/models/1">
            Go to model detail
          </Link>
          <Link className="button-link secondary" to="/submit">
            Go to submission page
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>API Proxy Check</h2>
        <p>The response below comes from the backend placeholder route `/api/models`.</p>
        <pre>{responseText}</pre>
      </div>
    </section>
  );
}
