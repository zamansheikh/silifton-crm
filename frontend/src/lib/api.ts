// Thin fetch wrapper around the Express API. Sends cookies (credentials)
// so the httpOnly JWT session rides along with every request.
import type {
  AuthUser,
  Member,
  Client,
  Project,
  Task,
  TimeEntry,
  ActivityItem,
  Invoice,
  DashboardData,
  TimerState,
  TaskComment,
  ProjectFile,
  Expense,
  InvoiceLine,
  Account,
  JournalEntry,
  JournalLine,
  TrialBalance,
  Statements,
  AuditEntry,
  PeriodsResponse,
  FixedAsset,
  BankReconciliation,
  AuditPack,
  ShareLink,
  Credential,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7011";
const TOKEN_KEY = "silifton.token";
export const API_BASE = BASE;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Bearer-token fallback for cross-site deploys where third-party cookies are
// blocked. The httpOnly cookie remains the primary mechanism on same-site.
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(p: string) => request<T>(p);
const post = <T>(p: string, body?: unknown) =>
  request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const patch = <T>(p: string, body: unknown) =>
  request<T>(p, { method: "PATCH", body: JSON.stringify(body) });
const del = <T>(p: string) => request<T>(p, { method: "DELETE" });

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const r = await post<{ user: AuthUser; token: string }>("/auth/login", { email, password });
      setToken(r.token);
      return r;
    },
    register: async (name: string, email: string, password: string) => {
      const r = await post<{ user: AuthUser; token: string }>("/auth/register", { name, email, password });
      setToken(r.token);
      return r;
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ ok: true }>("/auth/change-password", { currentPassword, newPassword }),
    logout: async () => {
      const r = await post<{ ok: true }>("/auth/logout").catch(() => ({ ok: true as const }));
      setToken(null);
      return r;
    },
    me: () => get<{ user: AuthUser }>("/auth/me"),
  },
  dashboard: () => get<DashboardData>("/dashboard"),
  team: {
    list: () => get<Member[]>("/team"),
    get: (id: string) => get<Member>(`/team/${id}`),
    invite: (body: {
      name: string;
      email: string;
      role: string;
      title?: string;
      hourly?: number;
      appRole?: string;
      bg?: string;
    }) => post<Member>("/team", body),
    update: (id: string, body: Partial<Member>) => patch<Member>(`/team/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/team/${id}`),
  },
  clients: {
    list: () => get<Client[]>("/clients"),
    get: (id: string) => get<Client>(`/clients/${id}`),
    create: (body: { name: string } & Partial<Client>) => post<Client>("/clients", body),
    update: (id: string, body: Partial<Client>) => patch<Client>(`/clients/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/clients/${id}`),
  },
  projects: {
    list: () => get<Project[]>("/projects"),
    get: (id: string) => get<Project>(`/projects/${id}`),
    create: (body: { name: string; client: string } & Partial<Project>) =>
      post<Project>("/projects", body),
    update: (id: string, body: Partial<Project>) => patch<Project>(`/projects/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/projects/${id}`),
    pin: (id: string, pinned: boolean) => patch<Project>(`/projects/${id}/pin`, { pinned }),
    files: {
      list: (id: string) => get<ProjectFile[]>(`/projects/${id}/files`),
      upload: (id: string, body: { name: string; dataUrl: string }) =>
        post<ProjectFile>(`/projects/${id}/files`, body),
      remove: (id: string, fileId: string) => del<{ ok: true }>(`/projects/${id}/files/${fileId}`),
    },
  },
  tasks: {
    list: (params?: { project?: string; status?: string; assignee?: string }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ).toString();
      return get<Task[]>(`/tasks${q ? `?${q}` : ""}`);
    },
    get: (id: string) => get<Task>(`/tasks/${id}`),
    create: (body: { title: string; project: string } & Partial<Task>) =>
      post<Task>("/tasks", body),
    update: (id: string, body: Partial<Task>) => patch<Task>(`/tasks/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/tasks/${id}`),
    subtasks: {
      add: (taskId: string, title: string) => post<Task>(`/tasks/${taskId}/subtasks`, { title }),
      update: (taskId: string, sid: string, body: { done?: boolean; title?: string }) =>
        patch<Task>(`/tasks/${taskId}/subtasks/${sid}`, body),
      remove: (taskId: string, sid: string) => del<Task>(`/tasks/${taskId}/subtasks/${sid}`),
    },
    comments: {
      list: (taskId: string) => get<TaskComment[]>(`/tasks/${taskId}/comments`),
      add: (taskId: string, body: string) => post<TaskComment>(`/tasks/${taskId}/comments`, { body }),
      remove: (taskId: string, cid: string) => del<{ ok: true }>(`/tasks/${taskId}/comments/${cid}`),
    },
  },
  time: {
    list: (params?: { person?: string; project?: string; mine?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.person) q.set("person", params.person);
      if (params?.project) q.set("project", params.project);
      if (params?.mine) q.set("mine", "1");
      const s = q.toString();
      return get<TimeEntry[]>(`/time${s ? `?${s}` : ""}`);
    },
    log: (body: { project: string; mins: number } & Partial<TimeEntry>) =>
      post<TimeEntry>("/time", body),
    remove: (id: string) => del<{ ok: true }>(`/time/${id}`),
    timer: {
      get: () => get<TimerState | null>("/time/timer"),
      start: (body: { project: string; task?: string | null; note?: string; billable?: boolean }) =>
        post<TimerState>("/time/timer/start", body),
      pause: () => post<TimerState>("/time/timer/pause"),
      resume: () => post<TimerState>("/time/timer/resume"),
      stop: () => post<{ entry: TimeEntry | null; mins: number }>("/time/timer/stop"),
    },
  },
  invoices: {
    list: (params?: { client?: string; status?: string }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ).toString();
      return get<Invoice[]>(`/invoices${q ? `?${q}` : ""}`);
    },
    get: (id: string) => get<Invoice>(`/invoices/${id}`),
    create: (body: { client: string; currency?: string; lines?: InvoiceLine[]; amount?: number; vatRate?: number; status?: string; dueIn?: string; notes?: string }) =>
      post<Invoice>("/invoices", body),
    update: (id: string, body: Partial<Invoice>) => patch<Invoice>(`/invoices/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/invoices/${id}`),
  },
  expenses: {
    list: (params?: { category?: string; project?: string; status?: string }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ).toString();
      return get<Expense[]>(`/expenses${q ? `?${q}` : ""}`);
    },
    create: (body: {
      category: string;
      amount: number;
      vendor?: string;
      project?: string | null;
      currency?: string;
      vatRate?: number;
      date?: string;
      note?: string;
      status?: string;
      receiptDataUrl?: string;
    }) => post<Expense>("/expenses", body),
    update: (id: string, body: Partial<Expense> & { receiptDataUrl?: string }) =>
      patch<Expense>(`/expenses/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/expenses/${id}`),
  },
  accounting: {
    accounts: () => get<Account[]>("/accounting/accounts"),
    createAccount: (body: { code: string; name: string; type: string; normal?: string }) =>
      post<Account>("/accounting/accounts", body),
    journal: (params?: { source?: string; account?: string }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ).toString();
      return get<JournalEntry[]>(`/accounting/journal${q ? `?${q}` : ""}`);
    },
    createJournal: (body: { memo: string; date?: string; lines: JournalLine[] }) =>
      post<JournalEntry>("/accounting/journal", body),
    sync: () => post<{ ok: true; invoices: number; expenses: number }>("/accounting/sync"),
    trialBalance: () => get<TrialBalance>("/accounting/trial-balance"),
    statements: (period: string) => get<Statements>(`/accounting/statements?period=${period}`),
    periods: () => get<PeriodsResponse>("/accounting/periods"),
    closePeriod: (month: number) => post<{ ok: true; closedThroughMonth: number }>("/accounting/periods/close", { month }),
    reopenPeriod: (month: number) => post<{ ok: true; closedThroughMonth: number }>("/accounting/periods/reopen", { month }),
    bankRec: (account: string) => get<BankReconciliation>(`/accounting/bank-reconciliation?account=${account}`),
    bankRecToggle: (account: string, entryId: string) => post<{ ok: true; cleared: boolean }>("/accounting/bank-reconciliation/toggle", { account, entryId }),
    bankRecStatement: (account: string, balance: number) => post<{ ok: true }>("/accounting/bank-reconciliation/statement", { account, balance }),
    auditPack: (period: string) => get<AuditPack>(`/accounting/audit-pack?period=${period}`),
    share: (body: { period: string; days: number; label: string }) =>
      post<{ token: string; period: string; label: string; days: number }>("/accounting/share", body),
    shares: () => get<ShareLink[]>("/accounting/shares"),
    revokeShare: (token: string) => del<{ ok: true }>(`/accounting/shares/${token}`),
  },
  assets: {
    list: () => get<FixedAsset[]>("/assets"),
    create: (body: { name: string; category: string; cost: number; usefulLifeYears: number } & Partial<FixedAsset>) =>
      post<FixedAsset>("/assets", body),
    update: (id: string, body: Partial<FixedAsset>) => patch<FixedAsset>(`/assets/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/assets/${id}`),
  },
  audit: (params?: { entity?: string; actor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.entity) q.set("entity", params.entity);
    if (params?.actor) q.set("actor", params.actor);
    if (params?.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return get<AuditEntry[]>(`/audit${s ? `?${s}` : ""}`);
  },
  activity: (params?: { project?: string }) =>
    get<ActivityItem[]>(`/activity${params?.project ? `?project=${params.project}` : ""}`),
  credentials: {
    access: () => get<{ canAccess: boolean }>("/credentials/access"),
    list: () => get<Credential[]>("/credentials"),
    create: (body: Partial<Credential> & { title: string }) => post<Credential>("/credentials", body),
    update: (id: string, body: Partial<Credential>) => patch<Credential>(`/credentials/${id}`, body),
    remove: (id: string) => del<{ ok: true }>(`/credentials/${id}`),
    export: () => get<Credential[]>("/credentials/export"),
    import: (items: Partial<Credential>[], mode: "merge" | "replace") =>
      post<{ ok: true; count: number }>("/credentials/import", { items, mode }),
  },
};
