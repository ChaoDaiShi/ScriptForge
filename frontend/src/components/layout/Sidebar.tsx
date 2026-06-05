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
      className={`relative flex h-full flex-col border-r border-white/8 bg-[linear-gradient(180deg,#0d1119_0%,#090c14_100%)] backdrop-blur-xl transition-all duration-300 ${
        sidebarOpen ? "w-[18rem]" : "w-[5.25rem]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#9af5d6,#4dd0e1)] text-lg font-bold text-[#081019] shadow-[0_10px_24px_rgba(77,208,225,0.3)]">
            S
          </div>
          {sidebarOpen ? (
            <div className="min-w-0">
              <div className="truncate font-serif text-2xl text-white">
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[--text-subtle] transition-colors hover:bg-white/[0.08] hover:text-white"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeftClose
            className={`size-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-2 text-sm text-white">
            <Sparkles className="size-4 text-[--accent-soft]" />
            {sidebarOpen ? "Current sprint" : null}
          </div>
          {sidebarOpen ? (
            <div className="mt-3">
              <div className="font-medium text-white">Episode 01 polish</div>
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

      <div className="mt-auto border-t border-white/8 p-3">
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
            ? "bg-[linear-gradient(135deg,rgba(154,245,214,0.18),rgba(255,255,255,0.04))] text-white shadow-[0_14px_32px_rgba(24,24,24,0.18)]"
            : "text-[--text-subtle] hover:bg-white/[0.05] hover:text-white"
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
