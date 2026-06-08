// ─────────────────────────────────────────────────────────────────────
// Seed data — ported from the Silifton prototype. Fictional studio books.
// Emails + appRole added so team members double as login accounts.
// ─────────────────────────────────────────────────────────────────────
import type {
  Client,
  Project,
  Task,
  TimeEntry,
  ActivityItem,
  Invoice,
  Expense,
  FixedAsset,
  AppRole,
  JobRole,
  MemberStatus,
} from "../types.js";

export interface SeedMember {
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

// Every member can sign in with this password. `admin` is the default super admin.
export const DEFAULT_PASSWORD = "silifton";

export const TEAM: SeedMember[] = [
  { id: "ad", name: "Super Admin",   email: "admin@silifton.com", role: "Founder", appRole: "founder", title: "Super Admin",            bg: "linear-gradient(135deg, #6366f1, #a855f7)", mood: "",                               status: "offline",  util: 0,  hourly: 0 },
  { id: "mr", name: "Maya Reyes",    email: "maya@silifton.com",  role: "Founder", appRole: "founder", title: "Founder & CEO",          bg: "linear-gradient(135deg, #a855f7, #f472b6)", mood: "Shipping rate-limit middleware", status: "tracking", util: 92, hourly: 16500 },
  { id: "jk", name: "Jin Kobayashi", email: "jin@silifton.com",   role: "PM",      appRole: "pm",      title: "Senior Project Manager", bg: "linear-gradient(135deg, #06b6d4, #14b8a6)", mood: "Helio sprint planning",          status: "tracking", util: 88, hourly: 13000 },
  { id: "an", name: "Aman Naidu",    email: "aman@silifton.com",  role: "Dev",     appRole: "dev",     title: "Staff Engineer",         bg: "linear-gradient(135deg, #ec4899, #f472b6)", mood: "Reviewing PR #481",              status: "tracking", util: 95, hourly: 14500 },
  { id: "lp", name: "Liv Park",      email: "liv@silifton.com",   role: "Design",  appRole: "dev",     title: "Lead Product Designer",  bg: "linear-gradient(135deg, #10b981, #06b6d4)", mood: "Cart checkout v3",               status: "tracking", util: 78, hourly: 13500 },
  { id: "to", name: "Tomi Olabode",  email: "tomi@silifton.com",  role: "Dev",     appRole: "dev",     title: "Senior Engineer",        bg: "linear-gradient(135deg, #9333ea, #ec4899)", mood: "Quill editor refactor",          status: "tracking", util: 84, hourly: 13000 },
  { id: "sv", name: "Sara Vasquez",  email: "sara@silifton.com",  role: "QA",      appRole: "dev",     title: "QA Lead",                bg: "linear-gradient(135deg, #f59e0b, #ef4444)", mood: "Smoke tests · Atlas",            status: "idle",     util: 72, hourly: 11000 },
  { id: "rb", name: "Rumi Bhatt",    email: "rumi@silifton.com",  role: "Dev",     appRole: "dev",     title: "Mobile Engineer",        bg: "linear-gradient(135deg, #06b6d4, #a855f7)", mood: "iOS onboarding",                 status: "tracking", util: 80, hourly: 13000 },
  { id: "ek", name: "Eli Kazan",     email: "eli@silifton.com",   role: "Design",  appRole: "dev",     title: "Product Designer",       bg: "linear-gradient(135deg, #f472b6, #fbbf24)", mood: "Northwind illustrations",        status: "meeting",  util: 70, hourly: 12000 },
  { id: "pn", name: "Priya Nair",    email: "priya@silifton.com", role: "PM",      appRole: "pm",      title: "Project Manager",        bg: "linear-gradient(135deg, #14b8a6, #84cc16)", mood: "Client check-in · Lumen",        status: "idle",     util: 65, hourly: 12500 },
  { id: "dv", name: "Diego Vela",    email: "diego@silifton.com", role: "Dev",     appRole: "dev",     title: "Backend Engineer",       bg: "linear-gradient(135deg, #6366f1, #06b6d4)", mood: "DB migrations",                  status: "tracking", util: 86, hourly: 13500 },
  { id: "no", name: "Nora Olsen",    email: "nora@silifton.com",  role: "Ops",     appRole: "dev",     title: "Operations",             bg: "linear-gradient(135deg, #f97316, #ec4899)", mood: "Invoice runs",                   status: "offline",  util: 0,  hourly: 9500 },
];

export const CLIENTS: Client[] = [
  // International clients — billed in USD (software export, 0% VAT).
  { id: "helio",     name: "Helio Financial",    industry: "Fintech",    contact: "David Reyna",     since: "2023-08", currency: "USD", mrr: 24000, billed: 142000, outstanding: 18500, projects: 2, color: "#a855f7", logo: "H", tier: "Platinum" },
  { id: "northwind", name: "Northwind Inc",      industry: "Commerce",   contact: "Greta Halvorsen", since: "2024-02", currency: "USD", mrr: 18000, billed: 96000,  outstanding: 12000, projects: 1, color: "#06b6d4", logo: "N", tier: "Gold" },
  { id: "lumen",     name: "Lumen Studio",       industry: "Media",      contact: "Quinn Park",      since: "2024-04", currency: "USD", mrr: 12500, billed: 64000,  outstanding: 0,     projects: 1, color: "#f59e0b", logo: "L", tier: "Gold" },
  { id: "atlas",     name: "Atlas Health",       industry: "Healthcare", contact: "Dr. Roy Chen",    since: "2025-01", currency: "USD", mrr: 32000, billed: 78000,  outstanding: 17800, projects: 1, color: "#ef4444", logo: "A", tier: "Platinum" },
  { id: "orbit",     name: "Orbit Logistics",    industry: "Logistics",  contact: "Yael Mor",        since: "2025-02", currency: "USD", mrr: 9500,  billed: 28000,  outstanding: 0,     projects: 1, color: "#10b981", logo: "O", tier: "Silver" },
  { id: "ferra",     name: "Ferra & Co",         industry: "Retail",     contact: "Marc Ferra",      since: "2024-09", currency: "USD", mrr: 6500,  billed: 41000,  outstanding: 6500,  projects: 1, color: "#ec4899", logo: "F", tier: "Silver" },
  { id: "plume",     name: "Plume Notes",        industry: "SaaS",       contact: "Sky Hughes",      since: "2025-03", currency: "USD", mrr: 5000,  billed: 12000,  outstanding: 0,     projects: 1, color: "#22d3ee", logo: "P", tier: "Silver" },
  // Domestic clients — billed in BDT (15% VAT).
  { id: "dhakabank", name: "Dhaka Bank PLC",     industry: "Banking",    contact: "Tania Haque",     since: "2025-02", currency: "BDT", mrr: 1200000, billed: 4800000, outstanding: 900000, projects: 1, color: "#16a34a", logo: "D", tier: "Platinum" },
  { id: "internal",  name: "Silifton · Internal", industry: "Internal",   contact: "Maya Reyes",      since: "2023-01", currency: "BDT", mrr: 0,     billed: 0,      outstanding: 0,     projects: 2, color: "#9333ea", logo: "T", tier: "Internal" },
];

export const PROJECTS: Project[] = [
  { id: "helio-v2",  name: "Helio Bank · v2 Migration",  client: "helio",     code: "HEL", accent: ["#a855f7", "#ec4899"], pct: 72, deadline: "Jun 14", start: "Feb 12", hours: 342, budget: 480, status: { label: "On track",  color: "var(--success)" }, tasksOpen: 24, tasksDone: 88, team: ["mr", "jk", "an", "to", "rb"], lead: "mr", priority: "High",     tags: ["migration", "api", "core"],  health: 84 },
  { id: "northwind", name: "Northwind Commerce",         client: "northwind", code: "NWC", accent: ["#06b6d4", "#14b8a6"], pct: 44, deadline: "Jul 02", start: "Mar 22", hours: 188, budget: 360, status: { label: "At risk",   color: "var(--warning)" }, tasksOpen: 32, tasksDone: 38, team: ["lp", "jk", "ek", "dv"],       lead: "jk", priority: "High",     tags: ["ecom", "redesign"],          health: 58 },
  { id: "lumen",     name: "Lumen · Design System",      client: "lumen",     code: "LMN", accent: ["#f59e0b", "#ec4899"], pct: 91, deadline: "Jun 03", start: "Apr 02", hours: 224, budget: 240, status: { label: "Review",    color: "var(--accent)" },  tasksOpen: 6,  tasksDone: 56, team: ["an", "mr", "to", "lp"],       lead: "lp", priority: "Medium",   tags: ["design-system", "library"],  health: 96 },
  { id: "atlas",     name: "Atlas Health · Patient App", client: "atlas",     code: "ATL", accent: ["#ef4444", "#f472b6"], pct: 28, deadline: "Aug 18", start: "May 06", hours: 94,  budget: 520, status: { label: "Blocked",   color: "var(--danger)" },  tasksOpen: 41, tasksDone: 12, team: ["lp", "an", "jk", "to", "rb", "sv"], lead: "an", priority: "Critical", tags: ["mobile", "hipaa", "ios"], health: 42 },
  { id: "quill",     name: "Quill — Editor SDK",         client: "internal",  code: "QLL", accent: ["#10b981", "#22d3ee"], pct: 60, deadline: "Jul 22", start: "Mar 04", hours: 156, budget: 280, status: { label: "On track",  color: "var(--success)" }, tasksOpen: 18, tasksDone: 42, team: ["mr", "to", "dv"],             lead: "to", priority: "Medium",   tags: ["sdk", "internal"],           health: 78 },
  { id: "orbit",     name: "Orbit Logistics · Portal",   client: "orbit",     code: "ORB", accent: ["#06b6d4", "#a855f7"], pct: 18, deadline: "Sep 30", start: "May 14", hours: 38,  budget: 220, status: { label: "On track",  color: "var(--success)" }, tasksOpen: 26, tasksDone: 6,  team: ["jk", "dv", "an"],             lead: "jk", priority: "Medium",   tags: ["portal", "dashboard"],       health: 70 },
  { id: "ferra",     name: "Ferra & Co · Headless POS",  client: "ferra",     code: "FER", accent: ["#ec4899", "#f97316"], pct: 84, deadline: "Jun 28", start: "Feb 03", hours: 198, budget: 200, status: { label: "In review", color: "var(--accent)" },  tasksOpen: 4,  tasksDone: 62, team: ["rb", "ek", "to"],             lead: "rb", priority: "High",     tags: ["retail", "pos"],             health: 88 },
  { id: "plume",     name: "Plume Notes · Sync engine",  client: "plume",     code: "PLM", accent: ["#22d3ee", "#a855f7"], pct: 38, deadline: "Aug 04", start: "Apr 21", hours: 64,  budget: 180, status: { label: "On track",  color: "var(--success)" }, tasksOpen: 22, tasksDone: 14, team: ["dv", "an", "mr"],             lead: "dv", priority: "Medium",   tags: ["crdt", "sync"],              health: 76 },
  { id: "dhakabank",   name: "Dhaka Bank · Core Portal",   client: "dhakabank", code: "DBL", accent: ["#16a34a", "#22d3ee"], pct: 52, deadline: "Jul 10", start: "Mar 01", hours: 210, budget: 400, status: { label: "On track", color: "var(--success)" }, tasksOpen: 20, tasksDone: 22, team: ["jk", "dv", "to", "an"], lead: "jk", priority: "High", tags: ["banking", "portal"], health: 80 },
];

export const TASKS: Task[] = [
  { id: "TSK-241", title: "API rate-limit middleware",    project: "helio-v2",  status: "doing",   priority: "High",     assignees: ["mr"],       est: 8,  spent: 4.3, due: "May 28", tags: ["api", "infra"],     subtasks: 6,  done: 4, comments: 12 },
  { id: "TSK-238", title: "Rate-limit fallback strategy", project: "helio-v2",  status: "done",    priority: "High",     assignees: ["an"],       est: 5,  spent: 5.2, due: "May 24", tags: ["api"],              subtasks: 3,  done: 3, comments: 8 },
  { id: "TSK-244", title: "Migrate transactions ledger",  project: "helio-v2",  status: "todo",    priority: "Critical", assignees: ["to", "dv"], est: 16, spent: 0,   due: "Jun 04", tags: ["migration", "db"],  subtasks: 8,  done: 0, comments: 2 },
  { id: "TSK-247", title: "OTP service rollback plan",    project: "helio-v2",  status: "review",  priority: "High",     assignees: ["jk"],       est: 3,  spent: 3.0, due: "May 27", tags: ["security"],         subtasks: 2,  done: 2, comments: 5 },
  { id: "TSK-251", title: "Audit log retention policy",   project: "helio-v2",  status: "backlog", priority: "Medium",   assignees: ["mr"],       est: 4,  spent: 0,   due: "Jun 12", tags: ["compliance"],       subtasks: 0,  done: 0, comments: 1 },
  { id: "TSK-188", title: "Cart redesign — review pass",  project: "northwind", status: "review",  priority: "High",     assignees: ["lp", "ek"], est: 6,  spent: 5.5, due: "May 28", tags: ["ux", "cart"],       subtasks: 4,  done: 3, comments: 14 },
  { id: "TSK-204", title: "Onboarding flow → Review",     project: "northwind", status: "review",  priority: "Medium",   assignees: ["jk", "lp"], est: 8,  spent: 7.0, due: "May 30", tags: ["onboarding"],       subtasks: 5,  done: 5, comments: 9 },
  { id: "TSK-211", title: "Checkout error states",        project: "northwind", status: "doing",   priority: "Medium",   assignees: ["dv"],       est: 4,  spent: 1.5, due: "Jun 02", tags: ["checkout"],         subtasks: 6,  done: 2, comments: 3 },
  { id: "TSK-220", title: "Stripe webhook reliability",   project: "northwind", status: "todo",    priority: "High",     assignees: ["dv"],       est: 5,  spent: 0,   due: "Jun 05", tags: ["stripe", "infra"],  subtasks: 0,  done: 0, comments: 0 },
  { id: "TSK-302", title: "Tokens — finalize semantic layer", project: "lumen", status: "review", priority: "Medium",   assignees: ["lp"],       est: 6,  spent: 6.2, due: "May 26", tags: ["tokens"],           subtasks: 5,  done: 5, comments: 11 },
  { id: "TSK-308", title: "Storybook publish action",     project: "lumen",     status: "done",    priority: "Low",      assignees: ["to"],       est: 2,  spent: 1.8, due: "May 22", tags: ["ci"],               subtasks: 2,  done: 2, comments: 3 },
  { id: "TSK-314", title: "Form components · final QA",   project: "lumen",     status: "doing",   priority: "Medium",   assignees: ["lp", "an"], est: 4,  spent: 2.0, due: "May 30", tags: ["qa", "forms"],      subtasks: 7,  done: 4, comments: 6 },
  { id: "TSK-481", title: "Patient lookup — HIPAA review",project: "atlas",     status: "doing",   priority: "Critical", assignees: ["an"],       est: 12, spent: 8.5, due: "May 28", tags: ["hipaa", "security"],subtasks: 10, done: 6, comments: 21 },
  { id: "TSK-485", title: "Onboarding — iOS deep linking",project: "atlas",     status: "review",  priority: "High",     assignees: ["rb"],       est: 6,  spent: 5.0, due: "May 29", tags: ["ios"],              subtasks: 3,  done: 3, comments: 4 },
  { id: "TSK-490", title: "Push notifications setup",     project: "atlas",     status: "todo",    priority: "Medium",   assignees: ["rb"],       est: 4,  spent: 0,   due: "Jun 03", tags: ["ios", "infra"],     subtasks: 0,  done: 0, comments: 0 },
  { id: "TSK-496", title: "Smoke test suite · Atlas",     project: "atlas",     status: "backlog", priority: "Medium",   assignees: ["sv"],       est: 8,  spent: 0,   due: "Jun 08", tags: ["qa"],               subtasks: 0,  done: 0, comments: 2 },
  { id: "TSK-510", title: "Collaborative cursor sync",    project: "quill",     status: "doing",   priority: "High",     assignees: ["to", "mr"], est: 10, spent: 6.5, due: "May 30", tags: ["crdt"],             subtasks: 4,  done: 2, comments: 8 },
  { id: "TSK-515", title: "Plugin API draft v2",          project: "quill",     status: "todo",    priority: "Medium",   assignees: ["mr"],       est: 6,  spent: 0,   due: "Jun 06", tags: ["api"],              subtasks: 0,  done: 0, comments: 1 },
  { id: "TSK-600", title: "Pitch deck — last pass",       project: "lumen",     status: "todo",    priority: "High",     assignees: ["mr"],       est: 1,  spent: 0,   due: "May 26", tags: ["business"],         subtasks: 0,  done: 0, comments: 0 },
  { id: "TSK-601", title: "Stand-up notes → Notion",      project: "quill",     status: "todo",    priority: "Low",      assignees: ["mr"],       est: 0.25, spent: 0, due: "May 26", tags: ["ops"],              subtasks: 0,  done: 0, comments: 0 },
];

export const TIME_ENTRIES: Omit<TimeEntry, "id">[] = [
  { day: "Mon", date: "May 20", person: "mr", project: "helio-v2",  task: "TSK-241", mins: 180, billable: true,  note: "Middleware spike" },
  { day: "Mon", date: "May 20", person: "mr", project: "lumen",     task: "TSK-302", mins: 90,  billable: true,  note: "Token semantic layer" },
  { day: "Mon", date: "May 20", person: "mr", project: "quill",     task: "TSK-510", mins: 120, billable: false, note: "CRDT review w/ Tomi" },
  { day: "Tue", date: "May 21", person: "mr", project: "helio-v2",  task: "TSK-241", mins: 240, billable: true,  note: "Rate limit + sliding window" },
  { day: "Tue", date: "May 21", person: "mr", project: "atlas",     task: "TSK-481", mins: 90,  billable: true,  note: "HIPAA review · sync" },
  { day: "Wed", date: "May 22", person: "mr", project: "helio-v2",  task: "TSK-244", mins: 300, billable: true,  note: "Ledger migration prep" },
  { day: "Wed", date: "May 22", person: "mr", project: "quill",     task: "TSK-515", mins: 60,  billable: false, note: "API draft" },
  { day: "Thu", date: "May 23", person: "mr", project: "helio-v2",  task: "TSK-241", mins: 210, billable: true,  note: "Tests + edge cases" },
  { day: "Thu", date: "May 23", person: "mr", project: "northwind", task: "TSK-211", mins: 90,  billable: true,  note: "Pair w/ Diego on errors" },
  { day: "Fri", date: "May 24", person: "mr", project: "lumen",     task: "TSK-302", mins: 240, billable: true,  note: "Token finalize" },
  { day: "Fri", date: "May 24", person: "mr", project: "internal",  task: null,      mins: 120, billable: false, note: "Hiring loop · 2 candidates" },
  { day: "Mon", date: "May 26", person: "mr", project: "helio-v2",  task: "TSK-241", mins: 84,  billable: true,  note: "Live · in progress" },
];

export const ACTIVITY: Omit<ActivityItem, "id">[] = [
  { who: "an", action: "closed task",         target: "API rate-limit fallbacks",  kind: "TSK-238", time: "14 min ago", project: "helio-v2" },
  { who: "jk", action: "moved",               target: "Onboarding flow → Review",   kind: "TSK-204", time: "42 min ago", project: "northwind" },
  { who: "lp", action: "logged 2h 30m on",    target: "Cart redesign",              kind: "TIME",    time: "1h ago",     project: "northwind" },
  { who: "to", action: "commented on",        target: "Collaborative cursor sync",  kind: "TSK-510", time: "2h ago",     project: "quill" },
  { who: "rb", action: "opened PR for",       target: "iOS deep linking",           kind: "TSK-485", time: "2h ago",     project: "atlas" },
  { who: "an", action: "pushed branch",       target: "helio/auth-mfa",             kind: "GIT",     time: "3h ago",     project: "helio-v2" },
  { who: "jk", action: "created task",        target: "Stripe webhook reliability", kind: "TSK-220", time: "5h ago",     project: "northwind" },
  { who: "mr", action: "invoiced",            target: "Helio · May progress",       kind: "$24,000", time: "1d ago",     project: "helio-v2" },
];

// Helper: build an invoice from a single summary line + VAT.
function inv(
  id: string,
  client: string,
  net: number,
  vatRate: number,
  currency: "BDT" | "USD",
  status: Invoice["status"],
  dueIn: string,
  issued: string,
  description: string,
): Invoice {
  const subtotal = net;
  const vat = Math.round((net * vatRate) / 100);
  return {
    id,
    client,
    currency,
    lines: [{ description, qty: 1, rate: net }],
    subtotal,
    vatRate,
    vat,
    amount: subtotal + vat,
    status,
    dueIn,
    issued,
  };
}

export const INVOICES: Invoice[] = [
  // International clients — USD, 0% VAT (export of services).
  inv("INV-2026-041", "helio",     24000, 0, "USD", "Sent",    "14d", "May 22", "Helio v2 — May progress"),
  inv("INV-2026-040", "northwind", 12000, 0, "USD", "Sent",    "21d", "May 20", "Commerce redesign — sprint 4"),
  inv("INV-2026-039", "atlas",     17800, 0, "USD", "Overdue", "-3d", "May 02", "Patient app — April milestone"),
  inv("INV-2026-038", "lumen",     6400,  0, "USD", "Paid",    "—",   "May 01", "Design system — retainer"),
  inv("INV-2026-037", "ferra",     6500,  0, "USD", "Sent",    "9d",  "May 14", "Headless POS — phase 2"),
  // Domestic clients — BDT, 15% VAT.
  inv("INV-2026-036", "dhakabank", 1800000, 15, "BDT", "Paid", "—",   "Apr 28", "Core portal — April milestone"),
  inv("INV-2026-035", "dhakabank", 1200000, 15, "BDT", "Sent", "30d", "May 18", "Core portal — May milestone"),
];

export const EXPENSES: Omit<Expense, "createdAt">[] = [
  { id: "EXP-2026-001", category: "Salaries",  vendor: "Payroll",          project: null,        currency: "BDT", amount: 1450000, vatRate: 0,  vat: 0,     total: 1450000, date: "May 01", note: "May payroll — 11 staff",           status: "Paid",     createdBy: "no" },
  { id: "EXP-2026-002", category: "Software",   vendor: "Vercel",           project: "quill",     currency: "USD", amount: 240,     vatRate: 0,  vat: 0,     total: 240,     date: "May 03", note: "Hosting — Pro plan",               status: "Paid",     createdBy: "no" },
  { id: "EXP-2026-003", category: "Software",   vendor: "MongoDB Atlas",    project: "helio-v2",  currency: "USD", amount: 320,     vatRate: 0,  vat: 0,     total: 320,     date: "May 04", note: "Database cluster",                 status: "Paid",     createdBy: "dv" },
  { id: "EXP-2026-004", category: "Hardware",   vendor: "Star Tech",        project: null,        currency: "BDT", amount: 185000,  vatRate: 15, vat: 27750, total: 212750,  date: "May 09", note: "2× MacBook Pro for new hires",     status: "Approved", createdBy: "mr" },
  { id: "EXP-2026-005", category: "Office",     vendor: "bKash Merchant",   project: null,        currency: "BDT", amount: 65000,   vatRate: 15, vat: 9750,  total: 74750,   date: "May 12", note: "Office rent — Banani",             status: "Paid",     createdBy: "no" },
  { id: "EXP-2026-006", category: "Travel",     vendor: "Uber",             project: "atlas",     currency: "BDT", amount: 4200,    vatRate: 0,  vat: 0,     total: 4200,    date: "May 18", note: "Client visit — Atlas Health",      status: "Reimbursed", createdBy: "an" },
  { id: "EXP-2026-007", category: "Marketing",  vendor: "Meta Ads",         project: null,        currency: "USD", amount: 800,     vatRate: 0,  vat: 0,     total: 800,     date: "May 21", note: "LinkedIn + Meta campaign",         status: "Pending",  createdBy: "pn" },
  { id: "EXP-2026-008", category: "Software",   vendor: "Figma",            project: "lumen",     currency: "USD", amount: 180,     vatRate: 0,  vat: 0,     total: 180,     date: "May 23", note: "Design seats",                     status: "Pending",  createdBy: "lp" },
];

export const ASSETS: Omit<FixedAsset, "createdAt">[] = [
  { id: "FA-2026-001", name: "Dell PowerEdge server", category: "Computers", currency: "BDT", cost: 480000, salvage: 48000, usefulLifeYears: 4, purchaseDate: "Jan 15", status: "Active", fundedFrom: "bank", note: "On-prem build server", createdBy: "mr" },
  { id: "FA-2026-002", name: "10× MacBook Pro M4", category: "Computers", currency: "BDT", cost: 1850000, salvage: 185000, usefulLifeYears: 3, purchaseDate: "Feb 02", status: "Active", fundedFrom: "bank", note: "Engineering fleet", createdBy: "mr" },
  { id: "FA-2026-003", name: "Office furniture & fit-out", category: "Furniture", currency: "BDT", cost: 620000, salvage: 60000, usefulLifeYears: 7, purchaseDate: "Jan 03", status: "Active", fundedFrom: "payable", note: "Banani office", createdBy: "no" },
];
