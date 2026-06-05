import { NavLink } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Library, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-16 lg:w-64 border-r border-border bg-card flex flex-col h-full transition-all duration-300">
      <div className="p-4 border-b border-border text-center lg:text-left flex items-center justify-center lg:justify-start">
        <div className="w-8 h-8 rounded bg-primary text-primary-foreground font-bold flex items-center justify-center text-xl shrink-0">
          S
        </div>
        <span className="hidden lg:block ml-3 font-semibold tracking-tight text-foreground truncate">
          ScriptForge
        </span>
      </div>

      <nav className="flex flex-col gap-2 p-2 mt-4 flex-1">
        <SidebarItem
          to="/workbench"
          icon={<LayoutDashboard size={20} />}
          label="工作台"
        />
        <SidebarItem
          to="/tasks"
          icon={<CheckSquare size={20} />}
          label="任务中心"
        />
        <SidebarItem to="/assets" icon={<Library size={20} />} label="剧本库" />
      </nav>

      <div className="p-2 border-t border-border mt-auto">
        <SidebarItem
          to="/settings"
          icon={<Settings size={20} />}
          label="设置"
        />
      </div>
    </aside>
  );
}

function SidebarItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 p-3 rounded-md transition-colors ${
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`
      }
      title={label}
    >
      <div className="shrink-0">{icon}</div>
      <span className="hidden lg:block">{label}</span>
    </NavLink>
  );
}
