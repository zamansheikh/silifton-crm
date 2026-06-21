"use client";

import { Fragment, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, I, Avatar, Eyebrow } from "./primitives";
import { NotificationsBell } from "./notifications";
import { useApp } from "@/providers/app";
import { api } from "@/lib/api";
import { openSearch } from "@/lib/search-bus";
import { navAccess } from "@/lib/nav-access";
import type { AppRole } from "@/lib/types";

// Tracks the mobile breakpoint without hydration mismatch or setState-in-effect.
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 768px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 768px)").matches,
    () => false,
  );
}

const NavItem = ({
  label,
  icon,
  active,
  badge,
  badgeColor,
  href,
  collapsed,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: string;
  badgeColor?: string;
  href: string;
  collapsed?: boolean;
}) => (
  <Link
    href={href}
    className="nav-item"
    title={collapsed ? label : undefined}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: collapsed ? "9px 0" : "8px 11px",
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 9,
      fontSize: 13,
      color: active ? "var(--text)" : "var(--text-sub)",
      background: active
        ? "linear-gradient(90deg, color-mix(in oklab, var(--accent) 22%, transparent), color-mix(in oklab, var(--accent) 4%, transparent))"
        : "transparent",
      position: "relative",
      transition: "all .14s",
      textAlign: "left",
    }}
  >
    {active && (
      <span
        style={{
          position: "absolute",
          left: -1,
          top: 6,
          bottom: 6,
          width: 2,
          borderRadius: 99,
          background: "var(--accent-grad)",
          boxShadow: "0 0 12px var(--accent)",
        }}
      />
    )}
    <span style={{ color: active ? "var(--accent-soft)" : "var(--text-dim)", display: "flex", flex: "0 0 auto" }}>
      {icon}
    </span>
    {!collapsed && (
      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    )}
    {!collapsed && badge && (
      <span
        style={{
          fontSize: 10,
          color: badgeColor || "var(--accent-soft)",
          background: `color-mix(in oklab, ${badgeColor || "var(--accent)"} 20%, transparent)`,
          padding: "1px 6px",
          borderRadius: 4,
          fontWeight: 600,
          fontFamily: "'Geist Mono', monospace",
          letterSpacing: 0.3,
        }}
      >
        {badge}
      </span>
    )}
  </Link>
);

const NavGroup = ({ label, collapsed, children }: { label: string; collapsed?: boolean; children: ReactNode }) => (
  <div style={{ padding: collapsed ? "12px 0 4px" : "14px 0 4px" }}>
    {!collapsed && (
      <div style={{ padding: "0 18px 7px" }}>
        <Eyebrow>{label}</Eyebrow>
      </div>
    )}
    {collapsed && <div style={{ height: 1, margin: "6px 14px 8px", background: "var(--border)" }} />}
    <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 3 }}>{children}</div>
  </div>
);

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { tweak, setTweak, user, team, projects, perms, role, credentialsAccess } = useApp();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  // The collapse/expand rail is a desktop feature; the mobile drawer is always
  // full-width, so ignore the persisted collapsed state on mobile.
  const collapsed = !isMobile && tweak.sidebar === "collapsed";
  // Hard role gate (navAccess) combined with the user's own soft toggles (tweak).
  const access = navAccess(perms, role);
  const show = {
    tasks: access.tasks,
    time: access.time && tweak.showTime !== false,
    clients: access.clients && tweak.showClients !== false,
    team: access.team,
    invoices: access.invoices && tweak.showInvoices !== false,
    expenses: access.expenses,
    accounting: access.accounting,
    assets: access.assets,
    reports: access.reports && tweak.showReports !== false,
    audit: access.audit,
  };
  const operate = show.invoices || show.expenses || show.accounting || show.assets || show.reports;
  const showCredentials = role === "founder" || credentialsAccess;
  const is = (p: string) => pathname === p || (p !== "/dashboard" && pathname.startsWith(p));
  const taskCount = projects.reduce((s, p) => s + p.tasksOpen, 0);

  return (
    <aside
      className="app-sidebar"
      style={{
        background: "var(--bg-deep)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        transition: "width .25s cubic-bezier(.4,.2,.2,1)",
        zIndex: 2,
      }}
    >
      <div style={{ position: "absolute", top: -60, left: -40, width: 200, height: 200, background: "radial-gradient(circle, var(--accent), transparent 60%)", opacity: 0.28, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, right: -40, width: 220, height: 220, background: "radial-gradient(circle, var(--accent-2), transparent 65%)", opacity: 0.2, pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ padding: collapsed ? "18px 0 14px" : "20px 14px 16px", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start", position: "relative" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--accent-grad-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            fontFamily: "'Inter Tight', sans-serif",
            boxShadow: "0 0 0 1px rgba(255,255,255,.18) inset, 0 6px 20px color-mix(in oklab, var(--accent) 50%, transparent)",
            flex: "0 0 auto",
          }}
        >
          T
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.1, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3, fontFamily: "'Inter Tight', sans-serif" }}>Silifton</div>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Studio · {team.length} members</div>
          </div>
        )}
        {!collapsed && !isMobile && (
          <button onClick={() => setTweak("sidebar", "collapsed")} title="Collapse sidebar" className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }}>
            <Icon d={["M11 19l-7-7 7-7", "M19 19l-7-7 7-7"]} size={12} />
          </button>
        )}
      </div>
      {collapsed && (
        <div style={{ padding: "0 8px 8px", display: "flex", justifyContent: "center", position: "relative" }}>
          <button onClick={() => setTweak("sidebar", "expanded")} title="Expand sidebar" className="btn btn-ghost btn-icon" style={{ width: 32, height: 28 }}>
            <Icon d={I.arrow} size={13} />
          </button>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: "2px 12px 14px", position: "relative" }}>
          <div
            onClick={() => openSearch()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--surface), transparent)",
              border: "1px solid var(--border)",
              fontSize: 12.5,
              color: "var(--text-dim)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
          >
            <Icon d={I.search} size={13} />
            <span>Search anything</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)" }}>⌘K</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <div onClick={onNavigate} style={{ position: "relative", overflow: "auto", flex: 1 }}>
        <NavGroup collapsed={collapsed} label="Workspace">
          <NavItem collapsed={collapsed} active={pathname === "/dashboard"} href="/dashboard" label="Dashboard" icon={<Icon d={I.dashboard} />} />
          <NavItem collapsed={collapsed} active={is("/projects")} href="/projects" label="Projects" icon={<Icon d={I.projects} />} badge={String(projects.length)} />
          {show.tasks && (
            <NavItem collapsed={collapsed} active={is("/tasks")} href="/tasks" label="Tasks" icon={<Icon d={I.tasks} />} badge={String(taskCount)} />
          )}
          {show.time && (
            <NavItem collapsed={collapsed} active={is("/time")} href="/time" label="Time tracking" icon={<Icon d={I.time} />} badge="LIVE" badgeColor="var(--success)" />
          )}
          {show.clients && (
            <NavItem collapsed={collapsed} active={is("/clients")} href="/clients" label="Clients" icon={<Icon d={I.clients} />} />
          )}
          {show.team && (
            <NavItem collapsed={collapsed} active={is("/team")} href="/team" label="Team" icon={<Icon d={I.team} />} badge={String(team.length)} />
          )}
        </NavGroup>

        {operate && (
          <NavGroup collapsed={collapsed} label="Operate">
            {show.invoices && (
              <NavItem collapsed={collapsed} active={is("/invoices")} href="/invoices" label="Invoices" icon={<Icon d={I.invoices} />} />
            )}
            {show.expenses && (
              <NavItem collapsed={collapsed} active={is("/expenses")} href="/expenses" label="Expenses" icon={<Icon d={I.dollar} />} />
            )}
            {show.accounting && (
              <NavItem collapsed={collapsed} active={is("/accounting")} href="/accounting" label="Accounting" icon={<Icon d={I.layers} />} />
            )}
            {show.assets && (
              <NavItem collapsed={collapsed} active={is("/assets")} href="/assets" label="Fixed Assets" icon={<Icon d={I.archive} />} />
            )}
            {show.reports && (
              <NavItem collapsed={collapsed} active={is("/reports")} href="/reports" label="Reports" icon={<Icon d={I.reports} />} />
            )}
          </NavGroup>
        )}

        <NavGroup collapsed={collapsed} label="System">
          {showCredentials && (
            <NavItem collapsed={collapsed} active={is("/credentials")} href="/credentials" label="Credentials" icon={<Icon d={I.key} />} />
          )}
          {show.audit && (
            <NavItem collapsed={collapsed} active={is("/audit")} href="/audit" label="Audit log" icon={<Icon d={I.lock} />} />
          )}
          <NavItem collapsed={collapsed} active={is("/settings")} href="/settings" label="Settings" icon={<Icon d={I.settings} />} />
        </NavGroup>
      </div>

      {/* User footer */}
      <div style={{ padding: collapsed ? "12px 0" : 14, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start", position: "relative" }}>
        <Avatar name={user.name} bg={user.bg} size={32} ring="var(--accent)" />
        {!collapsed && (
          <>
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{user.title}</div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

const ROLE_LABEL: Record<AppRole, string> = {
  founder: "Founder",
  director: "Director",
  pm: "PM",
  accountant: "Accountant",
  auditor: "Auditor",
  dev: "Developer",
};

// The role reflects who is signed in — it is not a free toggle.
export function RoleBadge() {
  const { role } = useApp();
  return (
    <div
      title="Your access level (set by your account)"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 11px",
        borderRadius: 8,
        background: "var(--accent-grad)",
        color: "#fff",
        fontSize: 11.5,
        fontWeight: 600,
        boxShadow: "0 2px 10px color-mix(in oklab, var(--accent) 40%, transparent)",
        whiteSpace: "nowrap",
      }}
    >
      <Icon d={I.user} size={12} color="#fff" />
      {ROLE_LABEL[role]}
    </div>
  );
}

export function TopBar({ crumbs, onMenu }: { crumbs: string[]; onMenu?: () => void }) {
  const router = useRouter();
  const { user, perms, team } = useApp();
  const canManage = perms.projects;
  const online = team.filter((m) => m.status !== "offline").length || team.length;
  const logout = async () => {
    await api.auth.logout().catch(() => {});
    router.replace("/login");
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 22px",
        borderBottom: "1px solid var(--border)",
        background: "var(--topbar-bg)",
        flex: "0 0 auto",
        position: "relative",
        zIndex: 2,
        minWidth: 0,
      }}
    >
      <button className="btn btn-icon mobile-only" title="Menu" onClick={onMenu} style={{ flex: "0 0 auto" }}>
        <Icon d="M3 6h18M3 12h18M3 18h18" size={16} color="var(--text-sub)" />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-sub)", minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <Icon d={I.chevR} size={11} color="var(--text-dim)" />}
            <span
              style={{
                color: i === crumbs.length - 1 ? "var(--text)" : "var(--text-sub)",
                fontWeight: i === crumbs.length - 1 ? 500 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: i === crumbs.length - 1 ? "0 1 auto" : "0 0 auto",
                minWidth: 0,
              }}
            >
              {c}
            </span>
          </Fragment>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
        <div
          className="topbar-live-pill"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-sub)", backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
          Live · {online} online
        </div>

        <button className="btn btn-icon topbar-live-pill" title="Search (⌘K)" onClick={() => openSearch()}>
          <Icon d={I.search} size={14} color="var(--text-sub)" />
        </button>

        <RoleBadge />

        {canManage && (
          <Link href="/team?invite=1" className="btn topbar-invite-btn">
            <Icon d={I.plus} size={13} color="var(--accent-soft)" /> Invite
          </Link>
        )}
        {canManage && (
          <Link href="/projects?new=1" className="btn btn-primary">
            <Icon d={I.plus} size={13} /> <span className="topbar-new-text">New project</span>
          </Link>
        )}

        <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />

        <NotificationsBell />
        <button className="btn btn-icon" onClick={logout} title="Sign out">
          <Icon d={I.lock} size={14} color="var(--text-sub)" />
        </button>
        <Avatar name={user.name} bg={user.bg} size={32} ring="var(--accent)" />
      </div>
    </div>
  );
}
