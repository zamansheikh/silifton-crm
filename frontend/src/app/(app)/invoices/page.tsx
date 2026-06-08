"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, I, Eyebrow, StatusPill, SectionHeader } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { exportCsv } from "@/lib/export";
import type { Invoice, InvoiceLine, Currency } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  Paid: "var(--success)",
  Overdue: "var(--danger)",
  Sent: "var(--info)",
  Draft: "var(--text-dim)",
};

// Compact per-currency total, e.g. "$48K · ৳207K".
function sumByCurrency(list: Invoice[]): string {
  const by: Record<string, number> = {};
  list.forEach((i) => (by[i.currency] = (by[i.currency] ?? 0) + i.amount));
  const parts = Object.entries(by).map(([c, v]) => money(v, c));
  return parts.length ? parts.join(" · ") : money(0, "USD");
}

export default function InvoicesPage() {
  const { clientById, clients, perms } = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const load = () => api.invoices.list().then(setInvoices).catch(() => {});
  useEffect(() => { load(); }, []);

  const canManage = perms.finance;
  const filtered = invoices.filter((i) => filter === "all" || i.status.toLowerCase() === filter);

  const kpis = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "Paid");
    const outstanding = invoices.filter((i) => i.status !== "Paid");
    const overdue = invoices.filter((i) => i.status === "Overdue");
    const vat = invoices.reduce((a, i) => a + (i.currency === "BDT" ? i.vat : 0), 0);
    return [
      { label: "Billed", value: sumByCurrency(invoices), sub: `${invoices.length} invoices`, color: "var(--accent)", icon: <Icon d={I.invoices} size={12} /> },
      { label: "Paid", value: sumByCurrency(paid), sub: "collected", color: "var(--success)", icon: <Icon d={I.check} size={12} /> },
      { label: "Outstanding", value: sumByCurrency(outstanding), sub: "awaiting", color: "var(--warning)", icon: <Icon d={I.flag} size={12} /> },
      { label: "VAT (BDT)", value: money(vat, "BDT"), sub: "collected", color: "var(--info)", icon: <Icon d={I.dollar} size={12} /> },
    ];
  }, [invoices]);

  const setStatus = async (inv: Invoice, status: Invoice["status"]) => {
    await api.invoices.update(inv.id, { status }).catch(() => {});
    load();
  };

  const removeInvoice = async (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.id}? Its ledger entries are removed too. This can't be undone.`)) return;
    await api.invoices.remove(inv.id).catch(() => {});
    load();
  };

  const chips = ["all", "draft", "sent", "paid", "overdue"];
  const cols = "120px 1fr 96px 150px 120px 64px 132px";

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Operate</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Invoices
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {invoices.length} this period</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => exportCsv("invoices.csv", filtered.map((inv) => ({ id: inv.id, client: clientById[inv.client]?.name ?? inv.client, currency: inv.currency, subtotal: inv.subtotal, vat: inv.vat, total: inv.amount, status: inv.status, issued: inv.issued, due: inv.dueIn })))}><Icon d={I.download} size={12} /> Export</button>
          {canManage && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> New invoice</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {kpis.map((s) => (
          <div key={s.label} className="surface" style={{ padding: "14px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${s.color}, transparent 65%)`, opacity: 0.2, filter: "blur(15px)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklab, ${s.color} 22%, transparent)`, color: s.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</span>
              <Eyebrow>{s.label}</Eyebrow>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 8, position: "relative" }}>
              <span style={{ fontSize: 22, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {chips.map((k) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, textTransform: "capitalize", color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "var(--surface)", border: filter === k ? "none" : "1px solid var(--border)", borderRadius: 99, cursor: "pointer" }}>{k}</button>
        ))}
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <SectionHeader title="All invoices" subtitle="Net + VAT shown per line · click status to update" />
        </div>
        <div className="rt-head" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
          {["Invoice #", "Client", "Issued", "Total (net + VAT)", "Status", "Due", ""].map((h, i) => <Eyebrow key={i} size={10}>{h}</Eyebrow>)}
        </div>
        {filtered.map((inv) => {
          const c = clientById[inv.client];
          return (
            <div key={inv.id} className="rt-row inv-card" style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "12px 18px", borderTop: "1px solid var(--border)", alignItems: "center" }}>
              <span className="mono" data-label="Invoice" style={{ fontSize: 11.5, color: "var(--accent-soft)", letterSpacing: 0.4 }}>{inv.id}</span>
              <div data-label="Client" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {c && <span style={{ width: 24, height: 24, borderRadius: 5, background: `color-mix(in oklab, ${c.color} 22%, var(--surface-hi))`, color: c.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", border: `1px solid color-mix(in oklab, ${c.color} 30%, transparent)` }}>{c.logo}</span>}
                <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c?.name}</span>
              </div>
              <span data-label="Issued" style={{ fontSize: 12, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{inv.issued}</span>
              <div data-label="Total">
                <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{money(inv.amount, inv.currency, false)}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{money(inv.subtotal, inv.currency, false)} + {inv.vatRate}% VAT · {inv.currency}</div>
              </div>
              <div data-label="Status">
              {canManage ? (
                <select value={inv.status} onChange={(e) => setStatus(inv, e.target.value as Invoice["status"])} className="input" style={{ padding: "4px 8px", fontSize: 11.5, color: STATUS_COLOR[inv.status], fontWeight: 600, width: "auto" }}>
                  {["Draft", "Sent", "Paid", "Overdue"].map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : (
                <StatusPill label={inv.status} color={STATUS_COLOR[inv.status]} />
              )}
              </div>
              <span data-label="Due" style={{ fontSize: 11.5, color: inv.status === "Overdue" ? "var(--danger)" : "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{inv.dueIn}</span>
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="View / PDF"><Icon d={I.download} size={13} /></a>
                {canManage && inv.status !== "Paid" && (
                  <button className="btn btn-ghost btn-icon" title="Record payment" onClick={() => setPaying(inv)}><Icon d={I.dollar} size={13} color="var(--success)" /></button>
                )}
                {perms.admin && (
                  <button className="btn btn-ghost btn-icon" title="Delete invoice" onClick={() => removeInvoice(inv)}><Icon d={I.trash} size={13} color="var(--danger)" /></button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No invoices match.</div>}
      </div>

      {showNew && <NewInvoiceModal clients={clients} onClose={() => setShowNew(false)} onCreated={() => { load(); setShowNew(false); }} />}
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} onPaid={() => { load(); setPaying(null); }} />}
    </div>
  );
}

function PaymentModal({ invoice, onClose, onPaid }: { invoice: Invoice; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState("bKash");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.invoices.update(invoice.id, { status: "Paid", paymentMethod: method });
      onPaid();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not record payment");
      setBusy(false);
    }
  };

  return (
    <Modal title="Record payment" subtitle={`${invoice.id} · ${money(invoice.amount, invoice.currency, false)}`} onClose={onClose} width={420}>
      <Field label="Payment method">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["bKash", "Nagad", "Card", "Bank transfer", "Cash"].map((m) => (
            <button key={m} onClick={() => setMethod(m)} style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${method === m ? "transparent" : "var(--border)"}`, color: method === m ? "#fff" : "var(--text-sub)", background: method === m ? "var(--accent-grad)" : "var(--surface)" }}>{m}</button>
          ))}
        </div>
      </Field>
      <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 12 }}>
        Marks the invoice paid and posts the bank receipt to the ledger. Live gateway capture (bKash/Nagad/SSLCommerz) plugs in here with merchant credentials.
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Recording…" : "Mark paid"}</button>
      </div>
    </Modal>
  );
}

// Net payment terms → an actual due date, computed from "today" (May 26 2026,
// the app's fixed clock) so users pick terms instead of typing raw "30d".
const DUE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dueDateInDays = (days: number) => {
  const d = new Date(2026, 4, 26);
  d.setDate(d.getDate() + days);
  return `${DUE_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
};
const TERMS: [string, string][] = [
  ["0", "Due on receipt"],
  ["7", "Net 7"],
  ["15", "Net 15"],
  ["30", "Net 30"],
  ["45", "Net 45"],
  ["60", "Net 60"],
  ["custom", "Custom date"],
];

function NewInvoiceModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [client, setClient] = useState(clients[0]?.id ?? "");
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [vatRate, setVatRate] = useState(15);
  const [status, setStatus] = useState<Invoice["status"]>("Draft");
  const [term, setTerm] = useState("30");
  const [dueIn, setDueIn] = useState(() => dueDateInDays(30)); // stored as a real date string
  const [notes, setNotes] = useState("");
  // "fixed" = bill the project/milestones (description + amount, no hours).
  // "hourly" = itemized qty × rate (for hourly contractors or detailed billing).
  const [mode, setMode] = useState<"fixed" | "hourly">("fixed");
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: "", qty: 1, rate: 0 }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const vat = Math.round((subtotal * vatRate) / 100);
  const total = subtotal + vat;

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { description: "", qty: 1, rate: 0 }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, j) => j !== i));

  // Switching mode collapses/keeps each line so totals never change unexpectedly.
  // Fixed price stores the whole line amount in `rate` with qty fixed at 1.
  const switchMode = (next: "fixed" | "hourly") => {
    if (next === mode) return;
    if (next === "fixed") {
      setLines((prev) => prev.map((l) => ({ description: l.description, qty: 1, rate: Math.round((Number(l.qty) || 0) * (Number(l.rate) || 0)) })));
    }
    setMode(next);
  };

  const submit = async () => {
    setErr(null);
    const clean = lines.filter((l) => l.description.trim() && l.rate >= 0);
    if (!clean.length) { setErr("Add at least one line item"); return; }
    setBusy(true);
    try {
      await api.invoices.create({ client, currency, vatRate, status, dueIn, lines: clean, notes: notes.trim() || undefined });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not create invoice");
      setBusy(false);
    }
  };

  return (
    <Modal title="New invoice" subtitle="Fixed-price, milestones, or itemized billing" onClose={onClose} width={620}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
        <Field label="Client">
          <select className="input" value={client} onChange={(e) => setClient(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="BDT">BDT ৳</option>
            <option value="USD">USD $</option>
          </select>
        </Field>
        <Field label="VAT %"><input className="input" type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} /></Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600 }}>Billing</label>
        <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
          {([["fixed", "Fixed price / milestones"], ["hourly", "Itemized / hourly"]] as const).map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                border: "none",
                cursor: "pointer",
                color: mode === m ? "#fff" : "var(--text-sub)",
                background: mode === m ? "var(--accent-grad)" : "transparent",
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>
        {mode === "fixed"
          ? "Bill the project as a fixed fee, or split it into milestones. One line = one charge."
          : "Bill by quantity × rate — e.g. hours for an hourly contractor."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {mode === "fixed" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 28px", gap: 8 }}>
              <Eyebrow size={9}>Description</Eyebrow><Eyebrow size={9}>Amount</Eyebrow><span />
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 28px", gap: 8, alignItems: "center" }}>
                <input className="input" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder={lines.length > 1 ? `Milestone ${i + 1}` : "Project fee — fixed scope"} style={{ padding: "6px 9px", fontSize: 12 }} />
                <input className="input" type="number" value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} placeholder="0" style={{ padding: "6px 9px", fontSize: 12 }} />
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeLine(i)} disabled={lines.length === 1}><Icon d={I.x} size={11} /></button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ fontSize: 11.5, justifyContent: "flex-start", padding: "4px 6px", width: "fit-content" }} onClick={addLine}><Icon d={I.plus} size={11} /> Add milestone</button>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 90px 28px", gap: 8 }}>
              <Eyebrow size={9}>Description</Eyebrow><Eyebrow size={9}>Qty</Eyebrow><Eyebrow size={9}>Rate</Eyebrow><Eyebrow size={9}>Amount</Eyebrow><span />
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 90px 28px", gap: 8, alignItems: "center" }}>
                <input className="input" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Development — 40h" style={{ padding: "6px 9px", fontSize: 12 }} />
                <input className="input" type="number" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} style={{ padding: "6px 9px", fontSize: 12 }} />
                <input className="input" type="number" value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} style={{ padding: "6px 9px", fontSize: 12 }} />
                <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "'Geist Mono', monospace", textAlign: "right" }}>{money((Number(l.qty) || 0) * (Number(l.rate) || 0), currency, false)}</span>
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeLine(i)} disabled={lines.length === 1}><Icon d={I.x} size={11} /></button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ fontSize: 11.5, justifyContent: "flex-start", padding: "4px 6px", width: "fit-content" }} onClick={addLine}><Icon d={I.plus} size={11} /> Add line</button>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Invoice["status"])}>
            {["Draft", "Sent", "Paid", "Overdue"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Payment terms">
          <select
            className="input"
            value={term}
            onChange={(e) => {
              const t = e.target.value;
              setTerm(t);
              if (t !== "custom") setDueIn(dueDateInDays(Number(t)));
            }}
          >
            {TERMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Due date">
          <DateField value={dueIn} onChange={(v) => { setDueIn(v); setTerm("custom"); }} placeholder="Pick a due date" />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, PO number, thank-you note…" rows={2} style={{ resize: "vertical", minHeight: 52 }} />
      </Field>

      <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        <Row k="Subtotal" v={money(subtotal, currency, false)} />
        <Row k={`VAT (${vatRate}%)`} v={money(vat, currency, false)} />
        <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
        <Row k="Total" v={money(total, currency, false)} bold />
      </div>

      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !client || total <= 0}>{busy ? "Creating…" : "Create invoice"}</button>
      </div>
    </Modal>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: bold ? 13 : 12, color: bold ? "var(--text)" : "var(--text-sub)", fontWeight: bold ? 600 : 400 }}>{k}</span>
      <span style={{ fontSize: bold ? 17 : 12.5, color: "var(--text)", fontWeight: bold ? 700 : 500, fontFamily: bold ? "'Inter Tight', sans-serif" : "'Geist Mono', monospace" }}>{v}</span>
    </div>
  );
}
