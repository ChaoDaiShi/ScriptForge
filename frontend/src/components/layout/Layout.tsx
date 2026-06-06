import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/60 to-transparent" />
        <Outlet />
      </main>
    </div>
  );
}
