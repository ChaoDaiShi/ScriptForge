import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import AssetsPage from "@/features/workbench/AssetsPage";
import TasksPage from "@/features/workbench/TasksPage";
import Workbench from "@/features/workbench/Workbench";
import ImportPage from "@/features/workbench/ImportPage";
import InsightsPage from "@/features/workbench/InsightsPage";
import DashboardPage from "@/features/workbench/DashboardPage";
import SettingsPage from "@/features/workbench/SettingsPage";
import ToastContainer from "@/components/ui/ToastContainer";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/workbench" replace />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="workbench" element={<Workbench />} />
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
