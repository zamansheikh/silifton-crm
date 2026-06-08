// ─────────────────────────────────────────────────────────────────────
// Domain types — shared shape between MongoDB documents and API responses.
// `id`/`code` string keys mirror the original prototype so the frontend
// can keep keying lookups by them.
// ─────────────────────────────────────────────────────────────────────

export type AppRole = "founder" | "director" | "pm" | "accountant" | "auditor" | "dev";
export type JobRole = "Founder" | "PM" | "Dev" | "Design" | "QA" | "Ops";
export type MemberStatus = "tracking" | "idle" | "meeting" | "offline";

export interface TeamMember {
  id: string; // short code, e.g. "mr"
  name: string;
  email: string;
  passwordHash: string;
  role: JobRole;
  appRole: AppRole;
  title: string;
  bg: string; // CSS gradient for avatar
  mood: string;
  status: MemberStatus;
  util: number;
  hourly: number;
  createdAt?: Date;
}

// Public team member (no secrets) — what the API returns.
export type PublicMember = Omit<TeamMember, "passwordHash">;

export type ClientTier = "Platinum" | "Gold" | "Silver" | "Internal";

export interface Client {
  id: string;
  name: string;
  industry: string;
  contact: string;
  since: string;
  currency: "BDT" | "USD";
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

export type Priority = "Low" | "Medium" | "High" | "Critical";

export interface Project {
  id: string;
  name: string;
  client: string; // client id
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
  team: string[]; // member ids
  lead: string; // member id
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
  uploadedBy: string; // member id
  createdAt: Date;
}

export type TaskStatus = "backlog" | "todo" | "doing" | "review" | "done";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  task: string; // task id
  author: string; // member id
  body: string;
  createdAt: Date;
}

export interface Task {
  id: string; // e.g. "TSK-241"
  title: string;
  project: string; // project id
  status: TaskStatus;
  priority: Priority;
  assignees: string[]; // member ids
  est: number;
  spent: number;
  due: string;
  tags: string[];
  subtasks: number; // derived: checklist.length
  done: number; // derived: checklist done count
  comments: number; // derived: comment count
  checklist?: Subtask[];
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimeEntry {
  id: string;
  day: string;
  date: string;
  person: string; // member id
  project: string; // project id
  task: string | null; // task id
  mins: number;
  billable: boolean;
  note: string;
  createdAt?: Date;
}

export interface ActivityItem {
  id: string;
  who: string; // member id
  action: string;
  target: string;
  kind: string;
  time: string;
  project: string;
}

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type Currency = "BDT" | "USD";

export interface InvoiceLine {
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string; // e.g. "INV-2026-041"
  client: string; // client id
  currency: Currency;
  lines: InvoiceLine[];
  subtotal: number;
  vatRate: number; // percent, e.g. 15
  vat: number;
  amount: number; // grand total = subtotal + vat
  status: InvoiceStatus;
  dueIn: string;
  issued: string;
  notes?: string;
  paymentMethod?: string; // bKash | Nagad | Card | Bank | Cash
  paidOn?: string;
}

export type ExpenseStatus = "Pending" | "Approved" | "Reimbursed" | "Paid";

export interface Expense {
  id: string; // e.g. "EXP-2026-001"
  category: string;
  vendor: string;
  project: string | null; // project id
  currency: Currency;
  amount: number; // net (ex-VAT)
  vatRate: number;
  vat: number;
  total: number; // amount + vat
  date: string;
  note: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  receiptPublicId?: string;
  createdBy: string; // member id
  createdAt: Date;
}

export interface ActiveTimer {
  person: string; // member id (one active timer per person)
  project: string;
  task: string | null;
  note: string;
  billable: boolean;
  running: boolean;
  startedAt: Date | null; // when the current running segment began
  accumulatedMs: number; // time banked from previous (paused) segments
}

export type AssetStatus = "Active" | "Disposed";

export interface FixedAsset {
  id: string; // "FA-2026-001"
  name: string;
  category: string; // Equipment / Computers / Furniture / Vehicle / Software
  currency: "BDT" | "USD";
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  purchaseDate: string; // display "Feb 12"
  status: AssetStatus;
  fundedFrom: "bank" | "payable"; // acquisition funding
  note: string;
  createdBy: string;
  createdAt: Date;
}

export interface AuditEntry {
  id: string;
  at: Date;
  actor: string; // member id or "anonymous"
  actorName: string;
  action: string; // e.g. "invoice.create"
  entity: string; // e.g. "invoice"
  entityId?: string;
  method: string;
  path: string;
  status: number;
  summary: string;
}

export interface MetaDoc {
  key: string; // "accounting" | "bankrec:<account>"
  closedThroughMonth?: number; // -1 = none closed
  statementBalance?: number; // bank reconciliation statement balance
}

export interface ReconMark {
  account: string;
  entryId: string;
}

export interface ShareLink {
  token: string;
  period: string;
  label: string;
  expiresAt: Date;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

// ── Accounting (double-entry) ───────────────────────────────────────
export type AccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";

export interface Account {
  code: string; // e.g. "1100"
  name: string;
  type: AccountType;
  normal: "debit" | "credit"; // normal balance side
  system?: boolean; // seeded core accounts can't be deleted
}

export interface JournalLine {
  account: string; // account code
  debit: number; // base currency (BDT)
  credit: number;
}

export type JournalSource = "manual" | "invoice" | "expense" | "asset";

export interface JournalEntry {
  id: string; // "JE-0001"
  date: string; // display date
  memo: string;
  lines: JournalLine[];
  currency: "BDT"; // ledger base currency
  source: JournalSource;
  sourceId?: string; // invoice/expense id
  kind?: string; // accrual | payment | expense | manual
  createdBy: string;
  createdAt: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
  role: JobRole;
  bg: string;
  title: string;
}
