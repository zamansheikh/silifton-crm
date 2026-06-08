import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/http.js";
import { isBalanced, syncAll } from "../lib/ledger.js";
import { monthOf, CURRENT_MONTH, MONTH_NAMES, YEAR } from "../lib/period.js";
import { getClosedThroughMonth, setClosedThroughMonth, assertOpen } from "../lib/closing.js";
import { computeStatements, buildAuditPack } from "../lib/auditpack.js";
import { randomUUID } from "node:crypto";
import type { Account, JournalEntry, JournalLine } from "../types.js";

const router = Router();
router.use(requireAuth);

// ── Chart of Accounts ───────────────────────────────────────────────
router.get(
  "/accounts",
  asyncHandler(async (_req, res) => {
    const accounts = await collections.accounts().find().sort({ code: 1 }).toArray();
    res.json(cleanAll(accounts));
  }),
);

const accountSchema = z.object({
  code: z.string().regex(/^\d{3,5}$/, "Code must be 3–5 digits"),
  name: z.string().min(2),
  type: z.enum(["Asset", "Liability", "Equity", "Income", "Expense"]),
  normal: z.enum(["debit", "credit"]).optional(),
});

router.post(
  "/accounts",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid account");
    const b = parsed.data;
    if (await collections.accounts().findOne({ code: b.code })) throw badRequest("Account code already exists");
    const normal = b.normal ?? (["Asset", "Expense"].includes(b.type) ? "debit" : "credit");
    const account: Account = { code: b.code, name: b.name, type: b.type, normal, system: false };
    await collections.accounts().insertOne(account);
    res.status(201).json(clean(account));
  }),
);

// ── Journal ─────────────────────────────────────────────────────────
router.get(
  "/journal",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.source) filter.source = req.query.source;
    const entries = await collections.journal().find(filter).toArray();
    entries.sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
    let result = entries;
    if (req.query.account) {
      result = entries.filter((e) => e.lines.some((l) => l.account === req.query.account));
    }
    res.json(cleanAll(result));
  }),
);

const journalSchema = z.object({
  date: z.string().optional(),
  memo: z.string().min(2),
  lines: z
    .array(z.object({ account: z.string().min(3), debit: z.number().min(0), credit: z.number().min(0) }))
    .min(2),
});

async function nextJournalId(): Promise<string> {
  const rows = await collections.journal().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const r of rows) {
    const m = String(r.id).match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `JE-${String(max + 1).padStart(4, "0")}`;
}

router.post(
  "/journal",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const parsed = journalSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid journal entry");
    const lines: JournalLine[] = parsed.data.lines
      .map((l) => ({ account: l.account, debit: Math.round(l.debit), credit: Math.round(l.credit) }))
      .filter((l) => l.debit > 0 || l.credit > 0);
    if (!isBalanced(lines)) throw badRequest("Entry must balance — total debits must equal total credits");

    // Validate accounts exist.
    const codes = [...new Set(lines.map((l) => l.account))];
    const found = await collections.accounts().find({ code: { $in: codes } }).toArray();
    if (found.length !== codes.length) throw badRequest("One or more accounts don't exist");

    const entryDate = parsed.data.date || new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    await assertOpen(entryDate);
    const entry: JournalEntry = {
      id: await nextJournalId(),
      date: entryDate,
      memo: parsed.data.memo,
      lines,
      currency: "BDT",
      source: "manual",
      kind: "manual",
      createdBy: req.user!.id,
      createdAt: new Date(),
    };
    await collections.journal().insertOne(entry);
    res.status(201).json(clean(entry));
  }),
);

// Re-post all auto entries from invoices & expenses.
router.post(
  "/sync",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const counts = await syncAll(req.user!.id);
    res.json({ ok: true, ...counts });
  }),
);

// ── Trial Balance ───────────────────────────────────────────────────
router.get(
  "/trial-balance",
  asyncHandler(async (_req, res) => {
    const [accounts, entries] = await Promise.all([
      collections.accounts().find().sort({ code: 1 }).toArray(),
      collections.journal().find().toArray(),
    ]);
    const debit: Record<string, number> = {};
    const credit: Record<string, number> = {};
    for (const e of entries) {
      for (const l of e.lines) {
        debit[l.account] = (debit[l.account] ?? 0) + l.debit;
        credit[l.account] = (credit[l.account] ?? 0) + l.credit;
      }
    }
    const rows = accounts
      .map((a) => {
        const d = Math.round(debit[a.code] ?? 0);
        const c = Math.round(credit[a.code] ?? 0);
        const net = d - c; // positive => debit balance
        return {
          code: a.code,
          name: a.name,
          type: a.type,
          normal: a.normal,
          debit: net > 0 ? net : 0,
          credit: net < 0 ? -net : 0,
        };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    res.json({ rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit, currency: "BDT" });
  }),
);

// ── Period close / reopen ───────────────────────────────────────────
router.get(
  "/periods",
  asyncHandler(async (_req, res) => {
    const [closedThrough, entries] = await Promise.all([
      getClosedThroughMonth(),
      collections.journal().find({}, { projection: { date: 1 } }).toArray(),
    ]);
    const counts: Record<number, number> = {};
    for (const e of entries) counts[monthOf(e.date)] = (counts[monthOf(e.date)] ?? 0) + 1;
    const months = [];
    for (let m = 0; m <= CURRENT_MONTH; m++) {
      months.push({ month: m, label: `${MONTH_NAMES[m]} ${YEAR}`, entries: counts[m] ?? 0, closed: m <= closedThrough });
    }
    res.json({ closedThroughMonth: closedThrough, months });
  }),
);

router.post(
  "/periods/close",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const month = Number(req.body?.month);
    if (Number.isNaN(month) || month < 0 || month > CURRENT_MONTH) throw badRequest("Invalid month");
    const current = await getClosedThroughMonth();
    await setClosedThroughMonth(Math.max(current, month));
    res.json({ ok: true, closedThroughMonth: Math.max(current, month) });
  }),
);

router.post(
  "/periods/reopen",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    // Reopen back to just before `month` (so `month` becomes editable again).
    const month = Number(req.body?.month);
    if (Number.isNaN(month)) throw badRequest("Invalid month");
    await setClosedThroughMonth(month - 1);
    res.json({ ok: true, closedThroughMonth: month - 1 });
  }),
);

// ── Financial statements (P&L, Balance Sheet, Cash Flow) ────────────
router.get(
  "/statements",
  asyncHandler(async (req, res) => {
    const [accounts, entries] = await Promise.all([
      collections.accounts().find().sort({ code: 1 }).toArray(),
      collections.journal().find().toArray(),
    ]);
    res.json(computeStatements(accounts, entries, String(req.query.period || "month")));
  }),
);

// ── Bank reconciliation ─────────────────────────────────────────────
const CASH_ACCOUNT_OPTS = ["1000", "1010", "1020"];

router.get(
  "/bank-reconciliation",
  asyncHandler(async (req, res) => {
    const account = String(req.query.account || "1010");
    const [entries, cleared, balDoc] = await Promise.all([
      collections.journal().find().toArray(),
      collections.recon().find({ account }).toArray(),
      collections.meta().findOne({ key: `bankrec:${account}` }),
    ]);
    const clearedSet = new Set(cleared.map((c) => c.entryId));
    const lines = entries
      .map((e) => {
        const amount = e.lines.filter((l) => l.account === account).reduce((s, l) => s + l.debit - l.credit, 0);
        return { entryId: e.id, date: e.date, memo: e.memo, amount: Math.round(amount), cleared: clearedSet.has(e.id) };
      })
      .filter((l) => l.amount !== 0)
      .sort((a, b) => monthOf(b.date) - monthOf(a.date));
    const ledgerBalance = lines.reduce((s, l) => s + l.amount, 0);
    const clearedBalance = lines.filter((l) => l.cleared).reduce((s, l) => s + l.amount, 0);
    const statementBalance = balDoc?.statementBalance ?? 0;
    res.json({
      account,
      accounts: CASH_ACCOUNT_OPTS,
      lines,
      ledgerBalance,
      clearedBalance,
      statementBalance,
      difference: statementBalance - clearedBalance,
    });
  }),
);

router.post(
  "/bank-reconciliation/toggle",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const account = String(req.body?.account || "");
    const entryId = String(req.body?.entryId || "");
    if (!account || !entryId) throw badRequest("account and entryId required");
    const existing = await collections.recon().findOne({ account, entryId });
    if (existing) await collections.recon().deleteOne({ account, entryId });
    else await collections.recon().insertOne({ account, entryId });
    res.json({ ok: true, cleared: !existing });
  }),
);

router.post(
  "/bank-reconciliation/statement",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const account = String(req.body?.account || "");
    const balance = Number(req.body?.balance);
    if (!account || Number.isNaN(balance)) throw badRequest("account and balance required");
    await collections.meta().updateOne(
      { key: `bankrec:${account}` },
      { $set: { statementBalance: Math.round(balance) } },
      { upsert: true },
    );
    res.json({ ok: true });
  }),
);

// ── Audit pack + auditor share links ────────────────────────────────
router.get(
  "/audit-pack",
  requireRole("pm", "accountant", "auditor"),
  asyncHandler(async (req, res) => {
    res.json(await buildAuditPack(String(req.query.period || "year")));
  }),
);

router.post(
  "/share",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const period = String(req.body?.period || "year");
    const days = Math.min(Math.max(Number(req.body?.days) || 14, 1), 365);
    const label = String(req.body?.label || "External auditor");
    const token = randomUUID().replace(/-/g, "");
    await collections.shares().insertOne({
      token,
      period,
      label,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      createdBy: req.user!.id,
      createdByName: req.user!.name,
      createdAt: new Date(),
    });
    res.status(201).json({ token, period, label, days });
  }),
);

router.get(
  "/shares",
  requireRole("pm", "accountant", "auditor"),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const shares = await collections.shares().find().sort({ createdAt: -1 }).toArray();
    res.json(cleanAll(shares.map((s) => ({ ...s, active: new Date(s.expiresAt) > now }))));
  }),
);

router.delete(
  "/shares/:token",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    await collections.shares().deleteOne({ token: req.params.token });
    res.json({ ok: true });
  }),
);

export default router;
