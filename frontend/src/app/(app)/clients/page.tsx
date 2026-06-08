"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I, Avatar, Eyebrow, StatusPill, SectionHeader } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { ColorPicker } from "@/components/color-picker";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { money } from "@/lib/format";
import type { Client, Invoice } from "@/lib/types";

const TIER_COLOR: Record<string, string> = {
  Platinum: "var(--accent)",
  Gold: "var(--warning)",
  Silver: "var(--info)",
  Internal: "var(--text-dim)",
};

export default function ClientsPage() {
  const { clients, projects, clientById, perms, bump } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api.invoices.list().then(setInvoices).catch(() => {});
  }, []);

  const canAdd = perms.projects;
  const canManage = perms.projects;

  const removeClient = async (c: Client) => {
    if (!confirm(`Delete ${c.name}? Their projects stay but lose this client link.`)) return;
    await api.clients.remove(c.id).catch(() => {});
    bump();
  };
  const filtered = clients.filter((c) => {
    if (filter === "all") return true;
    if (filter === "platinum") return c.tier === "Platinum";
    if (filter === "gold") return c.tier === "Gold";
    if (filter === "outstanding") return c.outstanding > 0;
    return true;
  });

  // Consolidate mixed-currency client figures to BDT for the studio-level KPIs.
  const toBDT = (amount: number, currency: string) => (currency === "USD" ? amount * 110 : amount);
  const totalMRR = clients.reduce((a, c) => a + toBDT(c.mrr, c.currency), 0);
  const totalOutstanding = clients.reduce((a, c) => a + toBDT(c.outstanding, c.currency), 0);
  const totalBilled = clients.reduce((a, c) => a + toBDT(c.billed, c.currency), 0);

  const kpis = [
    { label: "Active clients", value: clients.length, sub: "across tiers", color: "var(--accent)", icon: <Icon d={I.building} size={12} /> },
    { label: "Monthly recurring", value: money(totalMRR, "BDT"), sub: "MRR · consolidated", color: "var(--success)", icon: <Icon d={I.refresh} size={12} /> },
    { label: "Billed YTD", value: money(totalBilled, "BDT"), sub: "consolidated", color: "var(--accent-2)", icon: <Icon d={I.dollar} size={12} /> },
    { label: "Outstanding", value: money(totalOutstanding, "BDT"), sub: "unpaid", color: totalOutstanding > 3000000 ? "var(--warning)" : "var(--info)", icon: <Icon d={I.flag} size={12} /> },
  ];

  const chips: [string, string, number][] = [
    ["all", "All", clients.length],
    ["platinum", "Platinum", clients.filter((c) => c.tier === "Platinum").length],
    ["gold", "Gold", clients.filter((c) => c.tier === "Gold").length],
    ["outstanding", "Outstanding", clients.filter((c) => c.outstanding > 0).length],
  ];

  const ClientCard = ({ c }: { c: Client }) => {
    const projs = projects.filter((p) => p.client === c.id);
    return (
      <div className="surface" style={{ padding: 0, overflow: "hidden", cursor: "default", transition: "transform .15s, border-color .15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--border-hi)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <div style={{ height: 6, background: `linear-gradient(90deg, ${c.color}, color-mix(in oklab, ${c.color} 50%, var(--accent-2)))` }} />
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 9, background: `color-mix(in oklab, ${c.color} 22%, var(--surface-hi))`, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto", border: `1px solid color-mix(in oklab, ${c.color} 35%, transparent)` }}>{c.logo}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: "var(--text)", fontWeight: 600, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{c.name}</span>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{c.industry} · since {c.since}</div>
              <div style={{ marginTop: 5 }}>
                <span style={{ fontSize: 10, color: TIER_COLOR[c.tier], fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${TIER_COLOR[c.tier]} 14%, transparent)`, fontWeight: 600, letterSpacing: 0.4 }}>{c.tier.toUpperCase()}</span>
              </div>
            </div>
            {canManage && (
              <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
                <button className="btn btn-ghost btn-icon" title="Edit client" onClick={() => setEditing(c)}><Icon d={I.edit} size={13} /></button>
                {perms.admin && <button className="btn btn-ghost btn-icon" title="Delete client" onClick={() => removeClient(c)}><Icon d={I.trash} size={13} /></button>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <Avatar name={c.contact} bg={`color-mix(in oklab, ${c.color} 30%, var(--surface-hi))`} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.contact}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>PRIMARY CONTACT</div>
            </div>
            <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }}><Icon d={I.mail} size={12} /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>MRR</div>
              <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.4 }}>{money(c.mrr, c.currency, false)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Billed</div>
              <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.4 }}>{money(c.billed, c.currency, false)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Outstanding</div>
              <div style={{ fontSize: 16, color: c.outstanding ? "var(--warning)" : "var(--success)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.4 }}>{money(c.outstanding, c.currency, false)}</div>
            </div>
          </div>

          <div>
            <Eyebrow style={{ marginBottom: 6, display: "block" }}>{projs.length} project{projs.length !== 1 ? "s" : ""}</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {projs.map((p) => (
                <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{p.code}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{p.pct}%</span>
                </div>
              ))}
              {projs.length === 0 && <div style={{ fontSize: 11.5, color: "var(--text-dim)", fontStyle: "italic", fontFamily: "'Instrument Serif', serif", padding: "6px 8px" }}>No active projects.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const topClients = [...clients].filter((c) => c.billed > 0).sort((a, b) => toBDT(b.billed, b.currency) - toBDT(a.billed, a.currency)).slice(0, 6);
  const maxBilled = topClients[0] ? toBDT(topClients[0].billed, topClients[0].currency) : 1;

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Clients
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {clients.length} active accounts</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => exportCsv("clients.csv", filtered.map((c) => ({ id: c.id, name: c.name, industry: c.industry, tier: c.tier, currency: c.currency, contact: c.contact, since: c.since, mrr: c.mrr, billed: c.billed, outstanding: c.outstanding, projects: c.projects })))}><Icon d={I.download} size={12} /> Export CSV</button>
          {canAdd && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> Add client</button>}
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
              <span style={{ fontSize: 26, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {chips.map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, color: filter === k ? "#fff" : "var(--text-sub)", background: filter === k ? "var(--accent-grad)" : "var(--surface)", border: filter === k ? "none" : "1px solid var(--border)", borderRadius: 99, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {l} <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}>{n}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map((c) => <ClientCard key={c.id} c={c} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Top clients · billed YTD" subtitle="Revenue concentration" />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            {topClients.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 4, background: `color-mix(in oklab, ${c.color} 22%, var(--surface-hi))`, color: c.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", border: `1px solid color-mix(in oklab, ${c.color} 30%, transparent)`, flex: "0 0 auto" }}>{c.logo}</span>
                  <span style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                </div>
                <div style={{ position: "relative", height: 18 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 4, background: "var(--surface)", border: "1px solid var(--border)" }} />
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(toBDT(c.billed, c.currency) / maxBilled) * 100}%`, borderRadius: 4, background: `linear-gradient(90deg, ${c.color}, color-mix(in oklab, ${c.color} 60%, white))`, boxShadow: `0 0 8px color-mix(in oklab, ${c.color} 40%, transparent)` }} />
                </div>
                <span style={{ fontSize: 12.5, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600, textAlign: "right" }}>{money(c.billed, c.currency, false)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="Recent invoices" subtitle="Last 30 days" />
          </div>
          <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 90px 90px", gap: 12, padding: "8px 18px" }}>
            {["Invoice #", "Client", "Amount", "Status", "Due"].map((hd) => <Eyebrow key={hd} size={10}>{hd}</Eyebrow>)}
          </div>
          {invoices.map((inv) => {
            const c = clientById[inv.client];
            const statusColor = inv.status === "Paid" ? "var(--success)" : inv.status === "Overdue" ? "var(--danger)" : "var(--info)";
            return (
              <div key={inv.id} className="rt-row inv-card" style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 90px 90px", gap: 12, padding: "11px 18px", borderTop: "1px solid var(--border)", alignItems: "center" }}>
                <span className="mono" data-label="Invoice" style={{ fontSize: 11.5, color: "var(--accent-soft)", letterSpacing: 0.4 }}>{inv.id}</span>
                <div data-label="Client" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {c && <span style={{ width: 24, height: 24, borderRadius: 5, background: `color-mix(in oklab, ${c.color} 22%, var(--surface-hi))`, color: c.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", border: `1px solid color-mix(in oklab, ${c.color} 30%, transparent)` }}>{c.logo}</span>}
                  <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c?.name}</span>
                </div>
                <span data-label="Amount" style={{ fontSize: 13, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{money(inv.amount, inv.currency, false)}</span>
                <div data-label="Status"><StatusPill label={inv.status} color={statusColor} /></div>
                <span data-label="Due" style={{ fontSize: 11.5, color: inv.status === "Overdue" ? "var(--danger)" : "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{inv.dueIn}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showNew && (
        <NewClientModal onClose={() => setShowNew(false)} onCreated={() => { bump(); setShowNew(false); }} />
      )}
      {editing && (
        <EditClientModal client={editing} onClose={() => setEditing(null)} onSaved={() => { bump(); setEditing(null); }} />
      )}
    </div>
  );
}

function EditClientModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(client.name);
  const [industry, setIndustry] = useState(client.industry);
  const [contact, setContact] = useState(client.contact);
  const [tier, setTier] = useState(client.tier);
  const [currency, setCurrency] = useState(client.currency);
  const [mrr, setMrr] = useState(client.mrr);
  const [billed, setBilled] = useState(client.billed);
  const [outstanding, setOutstanding] = useState(client.outstanding);
  const [color, setColor] = useState(client.color);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sym = currency === "BDT" ? "৳" : "$";

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.clients.update(client.id, { name, industry, contact, tier, currency, mrr, billed, outstanding, color });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save client");
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit client" subtitle={client.name} onClose={onClose}>
      <Field label="Company name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Industry"><input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} /></Field>
        <Field label="Tier">
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value as Client["tier"])}>
            {["Platinum", "Gold", "Silver", "Internal"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Primary contact"><input className="input" value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="Billing currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Client["currency"])}>
            <option value="BDT">BDT ৳</option>
            <option value="USD">USD $</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label={`MRR (${sym})`}><input className="input" type="number" value={mrr} onChange={(e) => setMrr(Number(e.target.value))} /></Field>
        <Field label={`Billed (${sym})`}><input className="input" type="number" value={billed} onChange={(e) => setBilled(Number(e.target.value))} /></Field>
        <Field label={`Outstanding (${sym})`}><input className="input" type="number" value={outstanding} onChange={(e) => setOutstanding(Number(e.target.value))} /></Field>
      </div>
      <Field label="Card color"><ColorPicker value={color} onChange={setColor} /></Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Modal>
  );
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [contact, setContact] = useState("");
  const [tier, setTier] = useState("Silver");
  const [currency, setCurrency] = useState<"BDT" | "USD">("USD");
  const [mrr, setMrr] = useState(5000);
  const [color, setColor] = useState("#a855f7");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.clients.create({ name, industry, contact, tier: tier as Client["tier"], currency, mrr, color });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not add client");
      setBusy(false);
    }
  };

  return (
    <Modal title="Add client" subtitle="Create a new account record." onClose={onClose}>
      <Field label="Company name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Industry">
          <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Fintech" />
        </Field>
        <Field label="Tier">
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            {["Platinum", "Gold", "Silver", "Internal"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Primary contact">
          <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Jane Doe" />
        </Field>
        <Field label="Billing currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")}>
            <option value="USD">USD $ (international)</option>
            <option value="BDT">BDT ৳ (domestic)</option>
          </select>
        </Field>
      </div>
      <Field label={`MRR (${currency === "BDT" ? "৳" : "$"})`}>
        <input className="input" type="number" value={mrr} onChange={(e) => setMrr(Number(e.target.value))} />
      </Field>
      <Field label="Card color"><ColorPicker value={color} onChange={setColor} /></Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name}>{busy ? "Adding…" : "Add client"}</button>
      </div>
    </Modal>
  );
}
