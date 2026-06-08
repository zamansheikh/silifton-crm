import type { Perms } from "@/providers/app";
import type { AppRole } from "@/lib/types";

// Single source of truth for which sections each role may see. Used by both the
// sidebar (to hide items) and the Shell (to block direct-URL access), so the two
// can never drift apart.
//
//                      admin(founder/director)  pm   accountant  auditor  dev
//  Dashboard / Projects        ✓               ✓       ✓          ✓       ✓
//  Tasks / Time tracking       ✓               ✓       ✗          ✓       ✓
//  Clients                     ✓               ✓       ✓          ✓       ✗
//  Team                        ✓               ✓       ✗          ✓       ✗
//  Invoices/Expenses/          ✓               ✓       ✓          ✓       ✗
//   Accounting/Assets/Reports
//  Audit log                   ✓               ✓       ✓          ✓       ✗
//  Settings                    ✓               ✓       ✓          ✓       ✓
export type NavKey =
  | "dashboard" | "projects" | "tasks" | "time" | "clients" | "team"
  | "invoices" | "expenses" | "accounting" | "assets" | "reports"
  | "audit" | "settings";

export function navAccess(perms: Perms, role: AppRole): Record<NavKey, boolean> {
  const projectWork = perms.projects || perms.readOnly || role === "dev"; // tasks, time
  const finance = perms.finance || perms.readOnly; // money modules
  return {
    dashboard: true,
    projects: true,
    tasks: projectWork,
    time: projectWork,
    clients: perms.projects || perms.finance || perms.readOnly,
    team: perms.projects || perms.readOnly,
    invoices: finance,
    expenses: finance,
    accounting: finance,
    assets: finance,
    reports: finance,
    audit: role !== "dev",
    settings: true,
  };
}

// Map a pathname to its nav key, for route guarding. Unknown paths → null (allow).
export function routeKey(pathname: string): NavKey | null {
  const p = pathname.replace(/^\/+/, "");
  const seg = p.split("/")[0];
  const map: Record<string, NavKey> = {
    dashboard: "dashboard",
    projects: "projects",
    tasks: "tasks",
    time: "time",
    clients: "clients",
    team: "team",
    invoices: "invoices",
    expenses: "expenses",
    accounting: "accounting",
    assets: "assets",
    reports: "reports",
    audit: "audit",
    settings: "settings",
  };
  return map[seg] ?? null;
}
