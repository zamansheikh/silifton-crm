"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, I, Eyebrow, StatusPill, SectionHeader, ProgressBar } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { exportCsv } from "@/lib/export";
import type { FixedAsset } from "@/lib/types";

const CATEGORIES = ["Computers", "Equipment", "Furniture", "Vehicle", "Software", "Other"];

export default function AssetsPage() {
  const { perms, version, bump } = useApp();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);

  const load = () => api.assets.list().then(setAssets).catch(() => {});
  useEffect(() => { load(); }, [version]);

  const stats = useMemo(() => {
    const bdt = (a: FixedAsset, v: number) => (a.currency === "USD" ? v * 110 : v);
    const cost = assets.reduce((s, a) => s + bdt(a, a.cost), 0);
    const accum = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const nbv = assets.reduce((s, a) => s + a.netBookValue, 0);
    const monthly = assets.reduce((s, a) => s + a.monthlyDepreciation, 0);
    return { cost, accum, nbv, monthly };
  }, [assets]);

  const remove = async (a: FixedAsset) => {
    if (!confirm(`Delete asset ${a.id} (${a.name})? Its ledger entries are removed too.`)) return;
    await api.assets.remove(a.id).catch(() => {});
    load();
    bump();
  };

  const kpis = [
    { label: "Gross cost", value: money(stats.cost, "BDT"), sub: `${assets.length} assets`, color: "var(--info)", icon: <Icon d={I.layers} size={12} /> },
    { label: "Accum. depreciation", value: money(stats.accum, "BDT"), sub: "to date", color: "var(--warning)", icon: <Icon d={I.trend} size={12} /> },
    { label: "Net book value", value: money(stats.nbv, "BDT"), sub: "carrying", color: "var(--success)", icon: <Icon d={I.dollar} size={12} /> },
    { label: "Monthly charge", value: money(stats.monthly, "BDT"), sub: "depreciation", color: "var(--accent)", icon: <Icon d={I.refresh} size={12} /> },
  ];

  const cols = "1fr 110px 120px 120px 120px 96px 70px";

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Operate</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Fixed Assets
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· register · straight-line</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => exportCsv("fixed-assets.csv", assets.map((a) => ({ id: a.id, name: a.name, category: a.category, currency: a.currency, cost: a.cost, life: a.usefulLifeYears, monthly: a.monthlyDepreciation, accumulated: a.accumulatedDepreciation, nbv: a.netBookValue, status: a.status, purchased: a.purchaseDate })))}><Icon d={I.download} size={12} /> Export</button>
          {perms.finance && <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon d={I.plus} size={13} /> Add asset</button>}
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
              <span style={{ fontSize: 24, color: "var(--text)", fontWeight: 700, letterSpacing: -0.6, fontFamily: "'Inter Tight', sans-serif" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <SectionHeader title="Asset register" subtitle="Cost, depreciation and net book value · per BAS/IAS" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
          {["Asset", "Category", "Cost", "Accum. dep.", "Net book value", "Status", ""].map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
        </div>
        {assets.map((a, i) => {
          const depPct = a.cost ? Math.min(100, ((a.cost - a.netBookValue + (a.currency === "USD" ? 0 : 0)) / a.cost) * 100) : 0;
          return (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{a.id} · {a.purchaseDate} · {a.usefulLifeYears}y</div>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-sub)", padding: "2px 8px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", justifySelf: "start" }}>{a.category}</span>
              <span style={{ fontSize: 12.5, color: "var(--text)", fontFamily: "'Geist Mono', monospace" }}>{money(a.cost, a.currency, false)}</span>
              <div>
                <div style={{ fontSize: 12.5, color: "var(--warning)", fontFamily: "'Geist Mono', monospace" }}>{money(a.accumulatedDepreciation, "BDT", false)}</div>
                <div style={{ marginTop: 4 }}><ProgressBar pct={depPct} color="var(--warning)" height={3} glow={false} /></div>
              </div>
              <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{money(a.netBookValue, "BDT", false)}</span>
              <StatusPill label={a.status} color={a.status === "Active" ? "var(--success)" : "var(--text-dim)"} />
              <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                {perms.finance && <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => setEditing(a)}><Icon d={I.edit} size={12} /></button>}
                {perms.admin && <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => remove(a)}><Icon d={I.trash} size={12} /></button>}
              </div>
            </div>
          );
        })}
        {assets.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No assets yet.</div>}
      </div>

      {showNew && <AssetModal onClose={() => setShowNew(false)} onSaved={() => { load(); bump(); setShowNew(false); }} />}
      {editing && <AssetModal asset={editing} onClose={() => setEditing(null)} onSaved={() => { load(); bump(); setEditing(null); }} />}
    </div>
  );
}

function AssetModal({ asset, onClose, onSaved }: { asset?: FixedAsset; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(asset?.name ?? "");
  const [category, setCategory] = useState(asset?.category ?? "Computers");
  const [currency, setCurrency] = useState(asset?.currency ?? "BDT");
  const [cost, setCost] = useState(asset?.cost ?? 0);
  const [salvage, setSalvage] = useState(asset?.salvage ?? 0);
  const [usefulLifeYears, setLife] = useState(asset?.usefulLifeYears ?? 3);
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate ?? "");
  const [fundedFrom, setFundedFrom] = useState(asset?.fundedFrom ?? "bank");
  const [status, setStatus] = useState(asset?.status ?? "Active");
  const [note, setNote] = useState(asset?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const monthly = usefulLifeYears > 0 ? Math.round(Math.max(0, cost - salvage) / (usefulLifeYears * 12)) : 0;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const body = { name, category, currency, cost, salvage, usefulLifeYears, purchaseDate: purchaseDate || undefined, fundedFrom, status, note };
      if (asset) await api.assets.update(asset.id, body);
      else await api.assets.create(body);
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save asset");
      setBusy(false);
    }
  };

  return (
    <Modal title={asset ? "Edit asset" : "Add fixed asset"} subtitle={asset ? asset.id : "Capitalize and depreciate"} onClose={onClose} width={560}>
      <Field label="Asset name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dell PowerEdge server" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Purchase date"><DateField value={purchaseDate} onChange={setPurchaseDate} placeholder="Pick a date" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Currency">
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")}>
            <option value="BDT">BDT ৳</option>
            <option value="USD">USD $</option>
          </select>
        </Field>
        <Field label="Cost"><input className="input" type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></Field>
        <Field label="Salvage"><input className="input" type="number" value={salvage} onChange={(e) => setSalvage(Number(e.target.value))} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Life (years)"><input className="input" type="number" value={usefulLifeYears} onChange={(e) => setLife(Number(e.target.value))} /></Field>
        <Field label="Funded from">
          <select className="input" value={fundedFrom} onChange={(e) => setFundedFrom(e.target.value as "bank" | "payable")}>
            <option value="bank">Bank</option>
            <option value="payable">Payable</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as "Active" | "Disposed")}>
            <option value="Active">Active</option>
            <option value="Disposed">Disposed</option>
          </select>
        </Field>
      </div>
      <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Engineering fleet" /></Field>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-sub)" }}>Straight-line monthly charge</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: "var(--text)" }}>{money(monthly, currency, false)}/mo</span>
      </div>

      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !name || cost <= 0 || usefulLifeYears <= 0}>{busy ? "Saving…" : asset ? "Save" : "Add asset"}</button>
      </div>
    </Modal>
  );
}
