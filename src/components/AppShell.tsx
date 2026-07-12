import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { LibraryMonitor } from "@/components/LibraryMonitor";

export function AppShell() {
  return (
    <div className="min-h-screen bg-ink-950 text-zinc-100">
      <LibraryMonitor />
      <AppSidebar />
      <main className="min-h-screen pb-24 md:ml-[228px] md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
