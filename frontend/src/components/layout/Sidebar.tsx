import { NavLink } from "react-router-dom";
import {
  Cable,
  CheckSquare,
  LayoutDashboard,
  Library,
  LineChart,
  PanelLeftClose,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLayoutStore } from "@/store/useLayoutStore";

export default function Sidebar() {
  const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-[rgba(94,72,58,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.66)_0%,rgba(255,255,255,0.38)_100%)] backdrop-blur-xl transition-all duration-300 ${
        sidebarOpen ? "w-[18rem]" : "w-[5.25rem]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[rgba(94,72,58,0.08)] px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f5d6c1,#c8906d)] text-lg font-bold text-white shadow-[0_10px_24px_rgba(185,125,92,0.24)]">
            S
          </div>
          {sidebarOpen ? (
            <div className="min-w-0">
              <div className="truncate font-serif text-2xl text-foreground">
                ScriptForge
              </div>
              <div className="mt-0.5 text-xs uppercase tracking-[0.24em] text-[--text-faint]">
                narrative os
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(94,72,58,0.08)] bg-white/45 text-[--text-subtle] transition-colors hover:bg-white/70 hover:text-foreground"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeftClose
            className={`size-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-[24px] border border-[rgba(94,72,58,0.08)] bg-white/44 p-3 shadow-[0_12px_24px_rgba(94,72,58,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="size-4 text-[--accent-soft]" />
            {sidebarOpen ? "Current sprint" : null}
          </div>
          {sidebarOpen ? (
            <div className="mt-3">
              <div className="font-medium text-foreground">Episode 01 polish</div>
              <div className="mt-1 text-xs leading-5 text-[--text-subtle]">
                4 场景待复审，2 个素材包待同步。
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-2 px-3">
        <SidebarItem
          to="/workbench"
          icon={<LayoutDashboard size={20} />}
          label="工作台"
          expanded={sidebarOpen}
        />
        <SidebarItem
          to="/tasks"
          icon={<CheckSquare size={20} />}
          label="任务中心"
          expanded={sidebarOpen}
        />
        <SidebarItem
          to="/assets"
          icon={<Library size={20} />}
          label="剧本库"
          expanded={sidebarOpen}
        />
        <SidebarItem
          to="/insights"
          icon={<LineChart size={20} />}
          label="IP 评估"
          expanded={sidebarOpen}
        />
        <SidebarItem
          to="/dashboard"
          icon={<Cable size={20} />}
          label="API 与数据"
          expanded={sidebarOpen}
        />
      </nav>

      <div className="mt-auto border-t border-[rgba(94,72,58,0.08)] p-3">
        <SidebarItem
          to="/settings"
          icon={<Settings size={20} />}
          label="设置"
          expanded={sidebarOpen}
        />
      </div>
    </aside>
  );
}

function SidebarItem({
  to,
  icon,
  label,
  expanded,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
          isActive
            ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,244,236,0.64))] text-foreground shadow-[0_14px_32px_rgba(94,72,58,0.12)]"
            : "text-[--text-subtle] hover:bg-white/50 hover:text-foreground"
        }`
      }
      title={label}
    >
      <div className="shrink-0">{icon}</div>
      {expanded ? (
        <div className="truncate text-sm font-medium">{label}</div>
      ) : null}
    </NavLink>
  );
}
