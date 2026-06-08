"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, I, Eyebrow, StatusPill, SectionHeader } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { money, readFileAsDataUrl } from "@/lib/format";
import { exportCsv } from "@/lib/export";
import type { Expense, ExpenseStatus } from "@/lib/types";

const CATEGORIES = ["Salaries", "Software", "Hardware", "Office", "Travel", "Vendor", "Marketing", "Other"];
const STATUS_COLOR: Record<string, string> = {
  Pending: "var(--warning)",
  Approved: "var(--info)",
  Reimbursed: "var(--accent)",
  Paid: "var(--success)",
};

export default function ExpensesPage() {
  const { projectById, teamById, perms, version, bump } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const canManage = perms.finance;
  const load = () => api.expenses.list().then(setExpenses).catch(() => {});
  useEffect(() => { load(); }, [version]);

  const filtered = expenses.filter((e) => filter === "all" || e.status === filter || e.category === filter);

  // KPIs converted to BDT-ish view by summing per currency separately would be ideal;
  // for a quick read we report counts + totals grouped by currency.
  const stats = useMemo(() => {
    const byCur: Record<string, number> = {};
    let vat = 0;
    expenses.forEach((e) => {
      byCur[e.currency] = (byCur[e.currency] ?? 0) + e.total;
      vat += e.currency === "BDT" ? e.vat : 0;
    });
    const pending = expenses.filter((e) => e.status === "Pending").length;
    const cats: Record<string, number> = {};
    expenses.forEach((e) => (cats[e.category] = (cats[e.category] ?? 0) + (e.currency === "BDT" ? e.total : e.total * 110)));
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { byCur, vat, pending, topCat };
  }, [expenses]);

  const removeExpense = async (e: Expense) => {
    if (!confirm(`Delete expense ${e.id}?`)) return;
    await api.expenses.remove(e.id).catch(() => {});
    load();
  };
  const setStatus = async (e: Expense, status: ExpenseStatus) => {
    await api.expenses.update(e.id, { status }).catch(() => {});
    load();
  };

  const chips = ["all", "Pending", "Approved", "Paid", ...CATEGORIES.slice(0, 4)];
  const cols = "84px 110px 1fr 110px 120px 120px 70px";

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Operate</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Expenses
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {expenses.length} this period</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => exportCsv("expenses.csv", filtered.map((e) => ({ id: e.id, date: e.date, category: e.category, vendor: e.vendor, project: e.project ? projectById[e.project]?.name ?? e.project : "", currency: e.currency, net: e.amount, vat: e.vat, total: e.total, status: e.status, note: e.note })))}><Icon d={I.download} size={12} /> Export</button>
          {canManage && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> New expense</button>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Kpi label="Spend (BDT)" value={money(stats.byCur.BDT ?? 0, "BDT")} sub="incl. VAT" color="var(--accent)" icon={<Icon d={I.invoices} size={12} />} />
        <Kpi label="Spend (USD)" value={money(stats.byCur.USD ?? 0, "USD")} sub="incl. VAT" color="var(--info)" icon={<Icon d={I.dollar} size={12} />} />
        <Kpi label="VAT paid (BDT)" value={money(stats.vat, "BDT")} sub="reclaimable" color="var(--success)" icon={<Icon d={I.check} size={12} />} />
        <Kpi label="Pending approval" value={String(stats.pending)} sub={`top: ${stats.topCat}`} color="var(--warning)" icon={<Icon d={I.flag} size={12} />} />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map((k) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, textTransform: k === "all" ? "capitalize" : "none", color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "var(--surface)", border: filter === k ? "none" : "1px solid var(--border)", borderRadius: 99, cursor: "pointer" }}>{k}</button>
        ))}
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: "hidden" }}>
        <div className="rt-head" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
          {["Date", "Category", "Vendor / note", "Net", "VAT", "Status", ""].map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
        </div>
        {filtered.map((e, i) => {
          const proj = e.project ? projectById[e.project] : undefined;
          const who = teamById[e.createdBy];
          return (
            <div key={e.id} className="rt-row" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <div data-label="Date">
                <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "'Geist Mono', monospace" }}>{e.date}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{who?.name.split(" ")[0]}</div>
              </div>
              <span data-label="Category" style={{ fontSize: 11, color: "var(--text-sub)", padding: "2px 8px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", justifySelf: "start" }}>{e.category}</span>
              <div data-label="Vendor / note" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.vendor || e.note || "—"}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proj ? proj.name : "Overhead"}{e.note && e.vendor ? ` · ${e.note}` : ""}</div>
              </div>
              <div data-label="Net">
                <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{money(e.amount, e.currency, false)}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{e.currency}</div>
              </div>
              <div data-label="VAT" style={{ fontSize: 12, color: e.vat ? "var(--text)" : "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{e.vat ? money(e.vat, e.currency, false) : `${e.vatRate}%`}</div>
              <div data-label="Status">
              {canManage ? (
                <select value={e.status} onChange={(ev) => setStatus(e, ev.target.value as ExpenseStatus)} className="input" style={{ padding: "4px 8px", fontSize: 11.5, color: STATUS_COLOR[e.status], fontWeight: 600, width: "auto" }}>
                  {["Pending", "Approved", "Reimbursed", "Paid"].map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <StatusPill label={e.status} color={STATUS_COLOR[e.status]} />
              )}
              </div>
              <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="Receipt"><Icon d={I.paperclip} size={13} /></a>}
                <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => setEditing(e)}><Icon d={I.edit} size={12} /></button>
                {canManage && <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => removeExpense(e)}><Icon d={I.trash} size={12} /></button>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No expenses match.</div>}
      </div>

      {showNew && <ExpenseModal onClose={() => setShowNew(false)} onSaved={() => { load(); bump(); setShowNew(false); }} />}
      {editing && <ExpenseModal expense={editing} onClose={() => setEditing(null)} onSaved={() => { load(); bump(); setEditing(null); }} />}
    </div>
  );
}

function Kpi({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="surface" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${color}, transparent 65%)`, opacity: 0.2, filter: "blur(15px)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklab, ${color} 22%, transparent)`, color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <Eyebrow>{label}</Eyebrow>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 8, position: "relative" }}>
        <span style={{ fontSize: 24, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{value}</span>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{sub}</span>
      </div>
    </div>
  );
}

function ExpenseModal({ expense, onClose, onSaved }: { expense?: Expense; onClose: () => void; onSaved: () => void }) {
  const { projects } = useApp();
  const [category, setCategory] = useState(expense?.category ?? "Software");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [project, setProject] = useState(expense?.project ?? "");
  const [currency, setCurrency] = useState(expense?.currency ?? "BDT");
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [vatRate, setVatRate] = useState(expense?.vatRate ?? 0);
  const [date, setDate] = useState(expense?.date ?? "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const vat = Math.round((amount * vatRate) / 100);

  const pickReceipt = async (f: File | undefined) => {
    if (!f) return;
    setReceiptName(f.name);
    setReceiptDataUrl(await readFileAsDataUrl(f));
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const body = { category, vendor, project: project || null, currency, amount, vatRate, date: date || undefined, note, receiptDataUrl };
      if (expense) await api.expenses.update(expense.id, body);
      else await api.expenses.create(body);
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save expense");
      setBusy(false);
    }
  };

  return (
    <Modal title={expense ? "Edit expense" : "New expense"} subtitle={expense ? expense.id : "Record a cost for audit"} onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Vendor"><input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Star Tech" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Project (optional)">
          <select className="input" value={project ?? ""} onChange={(e) => setProject(e.target.value)}>
            <option value="">Overhead / none</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><DateField value={date} onChange={setDate} placeholder="Pick a date" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")}>
            <option value="BDT">BDT ৳</option>
            <option value="USD">USD $</option>
          </select>
        </Field>
        <Field label="Net amount"><input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="VAT %"><input className="input" type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} /></Field>
      </div>
      <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" /></Field>
      <Field label="Receipt">
        <input ref={fileRef} type="file" hidden onChange={(e) => pickReceipt(e.target.files?.[0])} />
        <button className="btn" type="button" onClick={() => fileRef.current?.click()} style={{ width: "100%", justifyContent: "center" }}>
          <Icon d={I.paperclip} size={13} /> {receiptName ?? (expense?.receiptUrl ? "Replace receipt" : "Attach receipt")}
        </button>
      </Field>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-sub)" }}>VAT {money(vat, currency, false)} · Total</span>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: "var(--text)" }}>{money(amount + vat, currency, false)}</span>
      </div>

      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !category || amount <= 0}>{busy ? "Saving…" : expense ? "Save" : "Add expense"}</button>
      </div>
    </Modal>
  );
}
