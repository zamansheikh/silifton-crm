// Domain types — mirror the backend API responses.

export type AppRole = "founder" | "director" | "pm" | "accountant" | "auditor" | "dev";
export type JobRole = "Founder" | "PM" | "Dev" | "Design" | "QA" | "Ops";
export type MemberStatus = "tracking" | "idle" | "meeting" | "offline";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "backlog" | "todo" | "doing" | "review" | "done";
export type ClientTier = "Platinum" | "Gold" | "Silver" | "Internal";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type Currency = "BDT" | "USD";
export type ExpenseStatus = "Pending" | "Approved" | "Reimbursed" | "Paid";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
  role: JobRole;
  bg: string;
  title: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: JobRole;
  appRole: AppRole;
  title: string;
  bg: string;
  mood: string;
  status: MemberStatus;
  util: number;
  hourly: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  contact: string;
  since: string;
  currency: Currency;
  mrr: number;
  billed: number;
  outstanding: number;
  projects: number;
  color: string;
  logo: string;
  tier: ClientTier;
}

export interface ProjectStatus {
  label: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  code: string;
  accent: [string, string];
  pct: number;
  deadline: string;
  start: string;
  hours: number;
  budget: number;
  status: ProjectStatus;
  tasksOpen: number;
  tasksDone: number;
  team: string[];
  lead: string;
  priority: Priority;
  tags: string[];
  health: number;
  pinned?: boolean;
}

export interface ProjectFile {
  id: string;
  project: string;
  name: string;
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format: string;
  uploadedBy: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  task: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  priority: Priority;
  assignees: string[];
  est: number;
  spent: number;
  due: string;
  tags: string[];
  subtasks: number;
  done: number;
  comments: number;
  checklist?: Subtask[];
  order?: number;
}

export interface TimeEntry {
  id: string;
  day: string;
  date: string;
  person: string;
  project: string;
  task: string | null;
  mins: number;
  billable: boolean;
  note: string;
  createdAt?: string;
}

export interface ActivityItem {
  id: string;
  who: string;
  action: string;
  target: string;
  kind: string;
  time: string;
  project: string;
}

export interface InvoiceLine {
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  client: string;
  currency: Currency;
  lines: InvoiceLine[];
  subtotal: number;
  vatRate: number;
  vat: number;
  amount: number; // grand total
  status: InvoiceStatus;
  dueIn: string;
  issued: string;
  notes?: string;
  paymentMethod?: string;
  paidOn?: string;
}

export interface Expense {
  id: string;
  category: string;
  vendor: string;
  project: string | null;
  currency: Currency;
  amount: number; // net
  vatRate: number;
  vat: number;
  total: number;
  date: string;
  note: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  receiptPublicId?: string;
  createdBy: string;
  createdAt?: string;
}

export interface TimerState {
  project: string;
  task: string | null;
  note: string;
  billable: boolean;
  running: boolean;
  elapsedMs: number;
}

// ── Accounting ──────────────────────────────────────────────────────
export type AccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  normal: "debit" | "credit";
  system?: boolean;
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  memo: string;
  lines: JournalLine[];
  currency: "BDT";
  source: "manual" | "invoice" | "expense";
  sourceId?: string;
  kind?: string;
  createdBy: string;
  createdAt?: string;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  normal: "debit" | "credit";
  debit: number;
  credit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  currency: "BDT";
}

export interface StatementRow {
  code: string;
  name: string;
  amount: number;
}

export interface Statements {
  period: { key: string; label: string };
  currency: "BDT";
  pnl: {
    income: StatementRow[];
    expense: StatementRow[];
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
  };
  balanceSheet: {
    assets: StatementRow[];
    liabilities: StatementRow[];
    equity: StatementRow[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    netIncomeToDate: number;
    balanced: boolean;
  };
  cashFlow: {
    opening: number;
    inflows: number;
    outflows: number;
    net: number;
    closing: number;
    operating: number;
    investing: number;
    financing: number;
    movements: { id: string; date: string; memo: string; amount: number }[];
  };
  vat: { outputVat: number; inputVat: number; netPayable: number };
}

export interface BankReconciliation {
  account: string;
  accounts: string[];
  lines: { entryId: string; date: string; memo: string; amount: number; cleared: boolean }[];
  ledgerBalance: number;
  clearedBalance: number;
  statementBalance: number;
  difference: number;
}

export interface FixedAsset {
  id: string;
  name: string;
  category: string;
  currency: Currency;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  purchaseDate: string;
  status: "Active" | "Disposed";
  fundedFrom: "bank" | "payable";
  note: string;
  createdBy: string;
  createdAt?: string;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  method: string;
  path: string;
  status: number;
  summary: string;
}

export interface PeriodInfo {
  month: number;
  label: string;
  entries: number;
  closed: boolean;
}

export interface PeriodsResponse {
  closedThroughMonth: number;
  months: PeriodInfo[];
}

export interface ShareLink {
  token: string;
  period: string;
  label: string;
  expiresAt: string;
  createdByName: string;
  createdAt: string;
  active?: boolean;
}

export interface AuditPack {
  company: { name: string; address: string; bin: string };
  generatedAt: string;
  statements: Statements;
  trialBalance: { rows: { code: string; name: string; type: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number };
  generalLedger: { id: string; date: string; memo: string; source: string; lines: JournalLine[] }[];
  arAging: { id: string; client: string; amount: number; currency: string; status: string; dueIn: string }[];
  assets: { id: string; name: string; category: string; currency: string; cost: number; accumulatedDepreciation: number; netBookValue: number }[];
  auditLog: AuditEntry[];
  share?: { label: string; period: string; expiresAt: string; sharedBy: string };
}

export interface DashboardData {
  kpis: {
    activeProjects: number;
    totalProjects: number;
    atRisk: number;
    hoursThisWeekTeam: number;
    myHoursThisWeek: number;
    billableRate: number;
    revenueMTD: number;
    outstanding: number;
    billableRevenue: number;
  };
  activeProjects: Project[];
  focus: Task[];
  focusDone: number;
  focusTotal: number;
  live: TimeEntry | null;
}
