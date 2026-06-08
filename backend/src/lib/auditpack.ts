// Shared financial-statement computation + a full audit-pack assembler used by
// the authed statements route, the export pack, and the public auditor link.
import { collections, cleanAll } from "../db.js";
import { monthOf, CURRENT_MONTH } from "./period.js";
import { depreciationOf } from "./ledger.js";
import type { Account, JournalEntry } from "../types.js";

const CASH_ACCOUNTS = ["1000", "1010", "1020"];

export function periodConfig(period: string) {
  switch (period) {
    case "month":
      return { key: "month", months: [CURRENT_MONTH], through: CURRENT_MONTH, start: CURRENT_MONTH, label: "May 2026" };
    case "quarter":
      return { key: "quarter", months: [3, 4, 5], through: 5, start: 3, label: "Q2 2026 · Apr–Jun" };
    case "year":
      return { key: "year", months: Array.from({ length: 12 }, (_, i) => i), through: 11, start: 0, label: "FY 2026" };
    default:
      return { key: "all", months: Array.from({ length: 12 }, (_, i) => i), through: 11, start: 0, label: "All time" };
  }
}

export function computeStatements(accounts: Account[], entries: JournalEntry[], period: string) {
  const cfg = periodConfig(period);
  const accById = Object.fromEntries(accounts.map((a) => [a.code, a]));

  const signed = (subset: JournalEntry[]) => {
    const m: Record<string, number> = {};
    for (const e of subset) for (const l of e.lines) m[l.account] = (m[l.account] ?? 0) + l.debit - l.credit;
    return m;
  };

  const pnlEntries = entries.filter((e) => cfg.months.includes(monthOf(e.date)));
  const bsEntries = entries.filter((e) => monthOf(e.date) <= cfg.through);
  const pnl = signed(pnlEntries);
  const bs = signed(bsEntries);

  const rowsFor = (bal: Record<string, number>, type: string, sign: 1 | -1) =>
    accounts
      .filter((a) => a.type === type)
      .map((a) => ({ code: a.code, name: a.name, amount: Math.round((bal[a.code] ?? 0) * sign) }))
      .filter((r) => r.amount !== 0);

  const income = rowsFor(pnl, "Income", -1);
  const expense = rowsFor(pnl, "Expense", 1);
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const assetsRows = rowsFor(bs, "Asset", 1);
  const liabilities = rowsFor(bs, "Liability", -1);
  const equity = rowsFor(bs, "Equity", -1);
  const totalAssets = assetsRows.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const equityAccounts = equity.reduce((s, r) => s + r.amount, 0);
  const cumIncome = accounts.filter((a) => a.type === "Income").reduce((s, a) => s - (bs[a.code] ?? 0), 0);
  const cumExpense = accounts.filter((a) => a.type === "Expense").reduce((s, a) => s + (bs[a.code] ?? 0), 0);
  const netIncomeToDate = Math.round(cumIncome - cumExpense);
  const equityRows = [...equity, { code: "—", name: "Net income (to date)", amount: netIncomeToDate }];
  const totalEquity = equityAccounts + netIncomeToDate;
  const balanced = Math.round(totalAssets) === Math.round(totalLiabilities + totalEquity);

  const cashLine = (e: JournalEntry) =>
    e.lines.filter((l) => CASH_ACCOUNTS.includes(l.account)).reduce((s, l) => s + l.debit - l.credit, 0);
  let inflows = 0;
  let outflows = 0;
  const movements = pnlEntries
    .map((e) => ({ id: e.id, date: e.date, memo: e.memo, amount: Math.round(cashLine(e)) }))
    .filter((m) => m.amount !== 0);
  for (const m of movements) (m.amount > 0 ? (inflows += m.amount) : (outflows += -m.amount));
  const opening = Math.round(entries.filter((e) => monthOf(e.date) < cfg.start).reduce((s, e) => s + cashLine(e), 0));
  const netCash = inflows - outflows;
  const classify = (e: JournalEntry): "operating" | "investing" | "financing" => {
    const counter = e.lines.filter((l) => !CASH_ACCOUNTS.includes(l.account));
    if (counter.some((l) => accById[l.account]?.type === "Equity")) return "financing";
    if (counter.some((l) => l.account === "1500" || l.account === "1510")) return "investing";
    return "operating";
  };
  const activities = { operating: 0, investing: 0, financing: 0 };
  for (const e of pnlEntries) {
    const amt = Math.round(cashLine(e));
    if (amt) activities[classify(e)] += amt;
  }

  const outputVat = Math.round(-(pnl["2100"] ?? 0));
  const inputVat = Math.round(pnl["1200"] ?? 0);

  return {
    period: { key: cfg.key, label: cfg.label },
    currency: "BDT" as const,
    pnl: { income, expense, totalIncome, totalExpense, netProfit },
    balanceSheet: { assets: assetsRows, liabilities, equity: equityRows, totalAssets, totalLiabilities, totalEquity, netIncomeToDate, balanced },
    cashFlow: { opening, inflows, outflows, net: netCash, closing: opening + netCash, ...activities, movements: movements.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 12) },
    vat: { outputVat, inputVat, netPayable: outputVat - inputVat },
  };
}

export function trialBalanceRows(accounts: Account[], entries: JournalEntry[]) {
  const debit: Record<string, number> = {};
  const credit: Record<string, number> = {};
  for (const e of entries) for (const l of e.lines) {
    debit[l.account] = (debit[l.account] ?? 0) + l.debit;
    credit[l.account] = (credit[l.account] ?? 0) + l.credit;
  }
  const rows = accounts
    .map((a) => {
      const net = Math.round((debit[a.code] ?? 0) - (credit[a.code] ?? 0));
      return { code: a.code, name: a.name, type: a.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0);
  return {
    rows,
    totalDebit: rows.reduce((s, r) => s + r.debit, 0),
    totalCredit: rows.reduce((s, r) => s + r.credit, 0),
  };
}

// Assemble the full audit pack for a period (statements + supporting schedules).
export async function buildAuditPack(period: string) {
  const [accounts, entries, invoices, clients, assets, audit] = await Promise.all([
    collections.accounts().find().sort({ code: 1 }).toArray(),
    collections.journal().find().toArray(),
    collections.invoices().find().toArray(),
    collections.clients().find().toArray(),
    collections.assets().find().toArray(),
    collections.audit().find().sort({ at: -1 }).limit(100).toArray(),
  ]);
  const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  const statements = computeStatements(accounts, entries, period);
  const tb = trialBalanceRows(accounts, entries);
  const gl = [...entries]
    .sort((a, b) => monthOf(a.date) - monthOf(b.date))
    .map((e) => ({ id: e.id, date: e.date, memo: e.memo, source: e.source, lines: e.lines }));

  const arAging = invoices
    .filter((i) => i.status !== "Paid")
    .map((i) => ({ id: i.id, client: clientName[i.client] ?? i.client, amount: i.amount, currency: i.currency, status: i.status, dueIn: i.dueIn }));

  const assetRows = assets.map((a) => {
    const dep = depreciationOf(a);
    return { id: a.id, name: a.name, category: a.category, currency: a.currency, cost: a.cost, accumulatedDepreciation: dep.accumulated, netBookValue: dep.nbv };
  });

  return {
    company: { name: "Silifton Studio", address: "Banani, Dhaka", bin: "0000000000" },
    generatedAt: new Date().toISOString(),
    statements,
    trialBalance: tb,
    generalLedger: gl,
    arAging,
    assets: assetRows,
    auditLog: cleanAll(audit),
  };
}
