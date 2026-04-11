import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { HomePage } from "./pages/HomePage";
import { ModelDetailPage } from "./pages/ModelDetailPage";
import { SubmitPage } from "./pages/SubmitPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/models/:id" element={<ModelDetailPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
