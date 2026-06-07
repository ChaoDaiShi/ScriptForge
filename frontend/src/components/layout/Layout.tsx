import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { LogIn } from "lucide-react";

export default function Layout() {
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="app-shell flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-auto">
        {!isLoggedIn && (
          <div className="flex items-center justify-between border-b border-[var(--line-soft)] bg-linear-to-r from-[rgba(123,184,232,0.06)] to-transparent px-6 py-2">
            <p className="text-xs text-[var(--text-subtle)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                游客模式 — 部分功能受限
              </span>
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#7bb8e8] hover:text-[#6aadd8] transition-colors"
            >
              <LogIn className="h-3 w-3" />
              登录 / 注册
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
