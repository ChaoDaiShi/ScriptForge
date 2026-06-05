import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_70%)]" />
        <Outlet />
      </main>
    </div>
  );
}
