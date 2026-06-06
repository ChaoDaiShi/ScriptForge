import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
