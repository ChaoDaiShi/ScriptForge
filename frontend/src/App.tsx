import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import AssetsPage from "@/features/workbench/AssetsPage";
import TasksPage from "@/features/workbench/TasksPage";
import Workbench from "@/features/workbench/Workbench";
import ImportPage from "@/features/workbench/ImportPage";
import InsightsPage from "@/features/workbench/InsightsPage";
import DashboardPage from "@/features/workbench/DashboardPage";
import SettingsPage from "@/features/workbench/SettingsPage";
import LoginPage from "@/features/auth/LoginPage";
import ToastContainer from "@/components/ui/ToastContainer";
import { useAuthStore } from "@/store/useAuthStore";

function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isLoggedIn, hasSkipped } = useAuthStore();

  useEffect(() => {
    if (!isLoggedIn && !hasSkipped) {
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, hasSkipped, navigate]);

  return <>{children}</>;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGate>
              <Layout />
            </AuthGate>
          }
        >
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="workbench" element={<Workbench />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <div className="page-container">
                <div className="empty-state">
                  <p className="font-serif text-6xl text-(--text-faint)">404</p>
                  <p className="mt-2 text-sm text-(--text-subtle)">
                    页面未找到
                  </p>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
