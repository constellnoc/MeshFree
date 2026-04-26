import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { getAdminToken, loginAsAdmin, setAdminToken } from "../api/admin";
import { useLanguage } from "../contexts/LanguageContext";

function getLoginErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallbackMessage;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export function AdminLoginPage() {
  const { copy } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStoredToken = Boolean(getAdminToken());

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage(copy.adminLogin.requiredCredentials);
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
      setErrorMessage(getLoginErrorMessage(error, copy.adminLogin.failedLogin));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-grid">
      <div className="card">
        <p className="section-kicker">{copy.adminLogin.kicker}</p>
        <h2>{copy.adminLogin.title}</h2>
        <p>{copy.adminLogin.intro}</p>

        <form className="submission-form" onSubmit={handleLogin}>
          <label className="form-field">
            <span className="form-label">{copy.adminLogin.username}</span>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={copy.adminLogin.usernamePlaceholder}
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span className="form-label">{copy.adminLogin.password}</span>
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
              {isSubmitting ? copy.adminLogin.signingIn : copy.adminLogin.signIn}
            </button>
          </div>
        </form>

        {errorMessage ? <p className="form-message error-message">{errorMessage}</p> : null}
      </div>

      <div className="card">
        <h2>{copy.adminLogin.workflowTitle}</h2>
        <p>{copy.adminLogin.workflowIntro}</p>
        <ul className="plain-list">
          <li>{copy.adminLogin.workflowView}</li>
          <li>{copy.adminLogin.workflowInspect}</li>
          <li>{copy.adminLogin.workflowManage}</li>
        </ul>
        <div className="actions">
          <Link className="button-link secondary" to="/admin/dashboard">
            {hasStoredToken ? copy.adminLogin.goToDashboard : copy.adminLogin.openDashboard}
          </Link>
        </div>
      </div>
    </section>
  );
}
