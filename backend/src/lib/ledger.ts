// Double-entry posting engine. The ledger base currency is BDT; USD source
// documents are converted at a fixed rate. Posting is idempotent per source
// document (re-posting replaces prior entries), so the ledger always mirrors
// the current state of invoices & expenses.
import { collections } from "../db.js";
import { ACC, CATEGORY_ACCOUNT } from "../data/coa.js";
import { isClosed } from "./closing.js";
import { monthOf, MONTH_NAMES, CURRENT_MONTH } from "./period.js";
import type { Invoice, Expense, FixedAsset, JournalEntry, JournalLine } from "../types.js";

// Straight-line monthly depreciation + accumulated/NBV for an asset.
export function depreciationOf(a: FixedAsset) {
  const cost = toBDT(a.cost, a.currency);
  const salvage = toBDT(a.salvage, a.currency);
  const months = Math.max(1, Math.round(a.usefulLifeYears * 12));
  const monthly = Math.round(Math.max(0, cost - salvage) / months);
  const start = monthOf(a.purchaseDate);
  // Depreciate from the month after acquisition up to the current month.
  const elapsed = Math.max(0, CURRENT_MONTH - start);
  const accum = Math.min(Math.max(0, cost - salvage), monthly * elapsed);
  return { cost, salvage, monthly, elapsed, accumulated: accum, nbv: cost - accum, startMonth: start };
}

export const USD_TO_BDT = Number(process.env.USD_TO_BDT || 110);

export function toBDT(amount: number, currency: string): number {
  return Math.round(currency === "USD" ? amount * USD_TO_BDT : amount);
}

export function isBalanced(lines: JournalLine[]): boolean {
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  return Math.round(d) === Math.round(c) && d > 0;
}

async function nextJournalId(): Promise<string> {
  const rows = await collections.journal().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const r of rows) {
    const m = String(r.id).match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `JE-${String(max + 1).padStart(4, "0")}`;
}

async function insertEntry(
  e: Omit<JournalEntry, "id" | "createdAt" | "currency"> & { lines: JournalLine[] },
): Promise<void> {
  const lines = e.lines.filter((l) => l.debit > 0 || l.credit > 0);
  if (!isBalanced(lines)) throw new Error(`Unbalanced journal entry: ${e.memo}`);
  const entry: JournalEntry = {
    id: await nextJournalId(),
    date: e.date,
    memo: e.memo,
    lines,
    currency: "BDT",
    source: e.source,
    sourceId: e.sourceId,
    kind: e.kind,
    createdBy: e.createdBy,
    createdAt: new Date(),
  };
  await collections.journal().insertOne(entry);
}

export async function unpost(source: "invoice" | "expense" | "asset", sourceId: string) {
  await collections.journal().deleteMany({ source, sourceId });
}

export async function postForInvoice(inv: Invoice, userId: string) {
  // Don't rewrite locked books — closed-period entries stay frozen.
  if (await isClosed(inv.issued)) return;
  await unpost("invoice", inv.id);
  if (inv.status === "Draft") return;

  const subtotal = toBDT(inv.subtotal, inv.currency);
  const vat = toBDT(inv.vat, inv.currency);
  const total = subtotal + vat;
  const bank = inv.currency === "USD" ? ACC.bankUSD : ACC.bankBDT;

  // Revenue accrual: DR AR / CR Revenue + VAT Payable
  await insertEntry({
    date: inv.issued,
    memo: `Invoice ${inv.id} — revenue`,
    source: "invoice",
    sourceId: inv.id,
    kind: "accrual",
    createdBy: userId,
    lines: [
      { account: ACC.ar, debit: total, credit: 0 },
      { account: ACC.revenue, debit: 0, credit: subtotal },
      { account: ACC.vatPayable, debit: 0, credit: vat },
    ],
  });

  // Payment: DR Bank / CR AR
  if (inv.status === "Paid") {
    await insertEntry({
      date: inv.issued,
      memo: `Invoice ${inv.id} — payment received`,
      source: "invoice",
      sourceId: inv.id,
      kind: "payment",
      createdBy: userId,
      lines: [
        { account: bank, debit: total, credit: 0 },
        { account: ACC.ar, debit: 0, credit: total },
      ],
    });
  }
}

export async function postForExpense(exp: Expense, userId: string) {
  if (await isClosed(exp.date)) return;
  await unpost("expense", exp.id);

  const net = toBDT(exp.amount, exp.currency);
  const vat = toBDT(exp.vat, exp.currency);
  const total = net + vat;
  const acct = CATEGORY_ACCOUNT[exp.category] ?? "5900";
  const paid = exp.status === "Paid" || exp.status === "Reimbursed";
  const credit = paid ? (exp.currency === "USD" ? ACC.bankUSD : ACC.bankBDT) : ACC.ap;

  await insertEntry({
    date: exp.date,
    memo: `Expense ${exp.id} — ${exp.vendor || exp.category}`,
    source: "expense",
    sourceId: exp.id,
    kind: "expense",
    createdBy: userId,
    lines: [
      { account: acct, debit: net, credit: 0 },
      { account: ACC.vatReceivable, debit: vat, credit: 0 },
      { account: credit, debit: 0, credit: total },
    ],
  });
}

export async function postForAsset(asset: FixedAsset, userId: string) {
  await unpost("asset", asset.id);
  const { cost, monthly, startMonth } = depreciationOf(asset);
  const bank = asset.currency === "USD" ? ACC.bankUSD : ACC.bankBDT;

  // Acquisition: capitalise the asset.
  await insertEntry({
    date: asset.purchaseDate,
    memo: `Asset ${asset.id} — ${asset.name} acquired`,
    source: "asset",
    sourceId: asset.id,
    kind: "acquisition",
    createdBy: userId,
    lines: [
      { account: ACC.fixedAssets, debit: cost, credit: 0 },
      { account: asset.fundedFrom === "payable" ? ACC.ap : bank, debit: 0, credit: cost },
    ],
  });

  // Monthly straight-line depreciation, dated into each month.
  if (monthly > 0) {
    for (let m = startMonth + 1; m <= CURRENT_MONTH; m++) {
      await insertEntry({
        date: `${MONTH_NAMES[m]} 28`,
        memo: `Asset ${asset.id} — depreciation ${MONTH_NAMES[m]}`,
        source: "asset",
        sourceId: asset.id,
        kind: "depreciation",
        createdBy: userId,
        lines: [
          { account: ACC.deprExpense, debit: monthly, credit: 0 },
          { account: ACC.accumDep, debit: 0, credit: monthly },
        ],
      });
    }
  }
}

// Rebuild every auto-posted entry from current invoices, expenses & assets.
export async function syncAll(userId: string): Promise<{ invoices: number; expenses: number; assets: number }> {
  const [invoices, expenses, assets] = await Promise.all([
    collections.invoices().find().toArray(),
    collections.expenses().find().toArray(),
    collections.assets().find().toArray(),
  ]);
  for (const inv of invoices) await postForInvoice(inv, userId);
  for (const exp of expenses) await postForExpense(exp, userId);
  for (const asset of assets) await postForAsset(asset, userId);
  return { invoices: invoices.length, expenses: expenses.length, assets: assets.length };
}
