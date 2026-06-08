"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, TopBar } from "./chrome";
import { TaskDrawer } from "./task-drawer";
import { CommandPalette } from "./command-palette";
import { useApp } from "@/providers/app";
import { TimerProvider } from "@/providers/timer";
import { navAccess, routeKey } from "@/lib/nav-access";

function useCrumbs(): string[] {
  const pathname = usePathname();
  const { projectById } = useApp();
  if (pathname === "/dashboard") return ["Workspace", "Dashboard"];
  if (pathname.startsWith("/projects/")) {
    const id = pathname.split("/")[2];
    return ["Workspace", "Projects", projectById[id]?.name ?? "—"];
  }
  if (pathname.startsWith("/projects")) return ["Workspace", "Projects"];
  if (pathname.startsWith("/tasks")) return ["Workspace", "Tasks"];
  if (pathname.startsWith("/time")) return ["Workspace", "Time tracking"];
  if (pathname.startsWith("/clients")) return ["Workspace", "Clients"];
  if (pathname.startsWith("/team")) return ["Workspace", "Team"];
  if (pathname.startsWith("/invoices")) return ["Operate", "Invoices"];
  if (pathname.startsWith("/expenses")) return ["Operate", "Expenses"];
  if (pathname.startsWith("/accounting")) return ["Operate", "Accounting"];
  if (pathname.startsWith("/assets")) return ["Operate", "Fixed Assets"];
  if (pathname.startsWith("/reports")) return ["Operate", "Reports"];
  if (pathname.startsWith("/audit")) return ["System", "Audit log"];
  if (pathname.startsWith("/settings")) return ["System", "Settings"];
  return ["Workspace"];
}

export function Shell({ children }: { children: React.ReactNode }) {
  const crumbs = useCrumbs();
  const router = useRouter();
  const pathname = usePathname();
  const { taskOpenId, closeTask, perms, role } = useApp();
  const [navOpen, setNavOpen] = useState(false);

  // Guard: if the current role can't see this section, bounce to the dashboard.
  // Keeps hidden pages truly inaccessible, not just hidden from the sidebar.
  const key = routeKey(pathname);
  const blocked = key ? !navAccess(perms, role)[key] : false;
  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  return (
    <TimerProvider>
      <div className={`app-shell ambient-bg${navOpen ? " nav-open" : ""}`}>
        <Sidebar onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
        <main style={{ display: "flex", flexDirection: "column", minWidth: 0, position: "relative", overflow: "hidden" }}>
          <TopBar crumbs={crumbs} onMenu={() => setNavOpen(true)} />
          <div className="screen-scroll">{blocked ? null : children}</div>
        </main>

        {taskOpenId && <TaskDrawer taskId={taskOpenId} onClose={closeTask} />}
        <CommandPalette />
      </div>
    </TimerProvider>
  );
}
