import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { getAdminToken, loginAsAdmin, setAdminToken } from "../api/admin";

function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Failed to log in. Please try again.";
  }

  return error instanceof Error ? error.message : "Failed to log in. Please try again.";
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStoredToken = Boolean(getAdminToken());

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await loginAsAdmin({
        username: username.trim(),
        password: password.trim(),
      });
      setAdminToken(result.token);
      navigate("/admin/dashboard");
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-grid">
      <div className="card">
        <p className="section-kicker">Admin Access</p>
        <h2>Sign in to the review dashboard</h2>
        <p>
          Only the seeded administrator account can access review actions for
          pending submissions.
        </p>

        <form className="submission-form" onSubmit={handleLogin}>
          <label className="form-field">
            <span className="form-label">Username</span>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <div className="actions">
            <button className="button-link" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}
      </div>

      <div className="card">
        <h2>Review workflow</h2>
        <p>After login, the dashboard lets the administrator:</p>
        <ul className="plain-list">
          <li>View all submissions or filter by review status.</li>
          <li>Inspect contact info, cover image, and stored ZIP name.</li>
          <li>Approve, reject, or delete a submission.</li>
        </ul>
        <div className="actions">
          <Link className="button-link secondary" to="/admin/dashboard">
            {hasStoredToken ? "Go to dashboard" : "Open dashboard"}
          </Link>
        </div>
      </div>
    </section>
  );
}
