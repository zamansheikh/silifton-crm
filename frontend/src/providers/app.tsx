"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { AuthUser, Member, Client, Project, AppRole } from "@/lib/types";

export interface Tweaks {
  theme: "dark" | "light";
  accent: string; // hex
  density: "comfortable" | "compact";
  sidebar: "expanded" | "collapsed";
  showInvoices: boolean;
  showReports: boolean;
  showTime: boolean;
  showClients: boolean;
}

export const TWEAK_DEFAULTS: Tweaks = {
  theme: "dark",
  accent: "#a855f7",
  density: "comfortable",
  sidebar: "expanded",
  showInvoices: true,
  showReports: true,
  showTime: true,
  showClients: true,
};

export const HEX_TO_ACCENT: Record<string, string> = {
  "#a855f7": "violet",
  "#06b6d4": "cyan",
  "#ec4899": "pink",
  "#10b981": "emerald",
  "#f59e0b": "amber",
};

export interface Perms {
  admin: boolean; // founder / director — full access incl. deletes, period close, member roles
  projects: boolean; // can manage projects, clients, team, tasks
  finance: boolean; // can manage invoices, expenses, accounting, assets
  readOnly: boolean; // auditor
  canWrite: boolean; // any non-auditor — may do collaborative writes (tasks, time, comments)
}

export function permsFor(role: AppRole): Perms {
  const admin = role === "founder" || role === "director";
  const readOnly = role === "auditor";
  return {
    admin,
    projects: admin || role === "pm",
    finance: admin || role === "pm" || role === "accountant",
    readOnly,
    canWrite: !readOnly,
  };
}

interface AppContextValue {
  user: AuthUser;
  role: AppRole;
  perms: Perms;
  setRole: (r: AppRole) => void;
  tweak: Tweaks;
  setTweak: (keyOrObj: keyof Tweaks | Partial<Tweaks>, value?: unknown) => void;
  team: Member[];
  clients: Client[];
  projects: Project[];
  teamById: Record<string, Member>;
  clientById: Record<string, Client>;
  projectById: Record<string, Project>;
  reloadCore: () => Promise<void>;
  version: number;
  bump: () => void;
  taskOpenId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
  credentialsAccess: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const STORAGE_KEY = "silifton.tweaks";

export function AppProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const [role, setRole] = useState<AppRole>(user.appRole);
  const [tweak, setTweakState] = useState<Tweaks>(TWEAK_DEFAULTS);
  const [team, setTeam] = useState<Member[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [version, setVersion] = useState(0);
  const [taskOpenId, setTaskOpenId] = useState<string | null>(null);
  const [credentialsAccess, setCredentialsAccess] = useState(user.appRole === "founder");

  // Hydrate tweaks from localStorage once.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTweakState({ ...TWEAK_DEFAULTS, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
  }, []);

  // Apply theme attrs to <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", tweak.theme);
    root.setAttribute("data-accent", HEX_TO_ACCENT[tweak.accent] || "violet");
    root.setAttribute("data-density", tweak.density);
    root.setAttribute("data-sidebar", tweak.sidebar);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tweak));
    } catch {
      /* ignore */
    }
  }, [tweak]);

  const setTweak = useCallback(
    (keyOrObj: keyof Tweaks | Partial<Tweaks>, value?: unknown) => {
      setTweakState((prev) =>
        typeof keyOrObj === "object"
          ? { ...prev, ...keyOrObj }
          : { ...prev, [keyOrObj]: value },
      );
    },
    [],
  );

  const reloadCore = useCallback(async () => {
    const [t, c, p] = await Promise.all([
      api.team.list(),
      api.clients.list(),
      api.projects.list(),
    ]);
    setTeam(t);
    setClients(c);
    setProjects(p);
  }, []);

  useEffect(() => {
    reloadCore().catch(() => {});
  }, [reloadCore, version]);

  // Whether the user may see the Credentials vault (founder, or has entries
  // shared with them). Drives the sidebar item + route guard.
  useEffect(() => {
    api.credentials
      .access()
      .then((r) => setCredentialsAccess(r.canAccess))
      .catch(() => {});
  }, [version]);

  // Close drawer on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTaskOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<AppContextValue>(() => {
    const teamById = Object.fromEntries(team.map((m) => [m.id, m]));
    const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));
    const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
    return {
      user,
      role,
      perms: permsFor(role),
      setRole,
      tweak,
      setTweak,
      team,
      clients,
      projects,
      teamById,
      clientById,
      projectById,
      reloadCore,
      version,
      bump,
      taskOpenId,
      openTask: setTaskOpenId,
      closeTask: () => setTaskOpenId(null),
      credentialsAccess,
    };
  }, [user, role, tweak, setTweak, team, clients, projects, reloadCore, version, bump, taskOpenId, credentialsAccess]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
