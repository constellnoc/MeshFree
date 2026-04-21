import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AboutPage } from "./pages/AboutPage";
import { HomePage } from "./pages/HomePage";
import { ModelDetailPage } from "./pages/ModelDetailPage";
import { UploadPage } from "./pages/SubmitPage";

function App() {
  const location = useLocation();
  const locationState = location.state as { backgroundLocation?: Location } | undefined;
  const backgroundLocation = locationState?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/models/:id" element={<ModelDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/submit" element={<Navigate to="/upload" replace />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation ? (
        <Routes>
          <Route path="/models/:id" element={<ModelDetailPage presentation="modal" />} />
        </Routes>
      ) : null}
    </>
  );
}

export default App;
