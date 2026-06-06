import { NavLink } from "react-router-dom";
import {
  CheckSquare,
  LayoutDashboard,
  Library,
  PanelLeftClose,
  Settings,
  LineChart,
  Cable,
  Upload,
} from "lucide-react";
import { useLayoutStore } from "@/store/useLayoutStore";

export default function Sidebar() {
  const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-(--line-soft) bg-white transition-all duration-300 ${
        sidebarOpen ? "w-56" : "w-18"
      }`}
    >
      <div className="flex items-center justify-between border-b border-(--line-soft) px-4 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-soft) text-sm font-bold text-white">
            S
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground">
                ScriptForge
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--text-subtle) transition-colors hover:bg-(--muted) hover:text-foreground"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeftClose
            className={`size-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-3">
        <SidebarItem
          to="/import"
          icon={<Upload size={20} />}
          label="导入文本"
          expanded={sidebarOpen}
        />
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

        <div className="my-3 border-t border-(--line-soft)" />

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

      <div className="mt-auto border-t border-(--line-soft) p-3">
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
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-(--accent-light) text-(--accent-soft) font-medium"
            : "text-(--text-subtle) hover:bg-(--muted) hover:text-foreground"
        }`
      }
      title={label}
    >
      <div className="shrink-0">{icon}</div>
      {expanded && <div className="truncate">{label}</div>}
    </NavLink>
  );
}
