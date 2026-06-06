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
      className={`relative flex h-full flex-col border-r border-[var(--line-soft)] bg-gradient-to-b from-white/[0.70] to-white/[0.40] backdrop-blur-xl transition-all duration-300 ${
        sidebarOpen ? "w-[17rem]" : "w-[4.5rem]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0d0ba] to-[#c8906d] text-base font-bold text-white shadow-[0_8px_20px_rgba(185,125,92,0.25)]">
            S
          </div>
          {sidebarOpen ? (
            <div className="min-w-0">
              <div className="truncate font-serif text-xl text-foreground">
                ScriptForge
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-[--text-faint]">
                narrative os
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line-soft)] bg-white/50 text-[--text-subtle] transition-colors hover:bg-white/80 hover:text-foreground"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeftClose
            className={`size-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-xl border border-[var(--line-soft)] bg-white/50 p-3">
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

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
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

      <div className="mt-auto border-t border-[var(--line-soft)] p-3">
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
        `flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
          isActive
            ? "bg-gradient-to-r from-white/80 to-white/40 text-foreground shadow-[0_8px_20px_rgba(94,72,58,0.08)]"
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
