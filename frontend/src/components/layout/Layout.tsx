import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(154,245,214,0.14),transparent_68%)]" />
        <Outlet />
      </main>
    </div>
  );
}
