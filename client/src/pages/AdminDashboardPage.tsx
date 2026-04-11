import { useState } from "react";

import { getAdminSubmissionsPlaceholder } from "../api/admin";

export function AdminDashboardPage() {
  const [responseText, setResponseText] = useState(
    "Click the button after login to call /api/admin/submissions",
  );

  const handleLoadSubmissions = async () => {
    const token = localStorage.getItem("meshfree_admin_token");

    if (!token) {
      setResponseText("No admin token found. Please visit /admin/login first.");
      return;
    }

    try {
      const data = await getAdminSubmissionsPlaceholder(token);
      setResponseText(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponseText(`Request failed: ${String(error)}`);
    }
  };

  return (
    <section className="page-grid">
      <div className="card">
        <h2>Admin Dashboard Page</h2>
        <p>This page is the placeholder for the admin review dashboard.</p>
        <button className="button-link" type="button" onClick={handleLoadSubmissions}>
          Load admin submissions
        </button>
      </div>

      <div className="card">
        <h2>Protected API Response</h2>
        <pre>{responseText}</pre>
      </div>
    </section>
  );
}
