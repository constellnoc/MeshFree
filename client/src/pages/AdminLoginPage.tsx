import { useState } from "react";
import { Link } from "react-router-dom";

import { loginAsAdminPlaceholder } from "../api/admin";

export function AdminLoginPage() {
  const [responseText, setResponseText] = useState("Click the button to call /api/admin/login");

  const handleLogin = async () => {
    try {
      const data = await loginAsAdminPlaceholder();
      localStorage.setItem("meshfree_admin_token", data.token);
      setResponseText(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponseText(`Request failed: ${String(error)}`);
    }
  };

  return (
    <section className="page-grid">
      <div className="card">
        <h2>Admin Login Page</h2>
        <p>This page is the placeholder for the admin login form.</p>
        <div className="actions">
          <button className="button-link" type="button" onClick={handleLogin}>
            Test login placeholder
          </button>
          <Link className="button-link secondary" to="/admin/dashboard">
            Go to dashboard
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Login Response</h2>
        <pre>{responseText}</pre>
      </div>
    </section>
  );
}
