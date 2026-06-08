"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { AuditPackView } from "@/components/audit-pack-view";
import { Icon, I } from "@/components/primitives";
import type { AuditPack } from "@/lib/types";

const PERIODS = [
  ["month", "May 2026"],
  ["quarter", "Q2 2026"],
  ["year", "FY 2026"],
  ["all", "All time"],
] as const;

export default function AuditPackPage() {
  const [period, setPeriod] = useState("year");
  const [pack, setPack] = useState<AuditPack | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("period");
    if (p) setPeriod(p);
  }, []);

  useEffect(() => {
    api.accounting.auditPack(period).then(setPack).catch(() => setErr(true));
  }, [period]);

  const csv = () => {
    if (!pack) return;
    const gl = pack.generalLedger.flatMap((e) =>
      e.lines.map((l) => ({ entry: e.id, date: e.date, memo: e.memo, account: l.account, debit: l.debit, credit: l.credit })),
    );
    exportCsv("general-ledger.csv", gl);
    exportCsv("trial-balance.csv", pack.trialBalance.rows);
    exportCsv("fixed-assets.csv", pack.assets);
    exportCsv("receivables.csv", pack.arAging);
    exportCsv("audit-log.csv", pack.auditLog.map((a) => ({ at: a.at, actor: a.actorName, action: a.action, entity: a.entity, id: a.entityId ?? "" })));
  };

  if (err) return <Center>Couldn’t load the audit pack — are you signed in with a finance/auditor role?</Center>;
  if (!pack) return <Center>Assembling audit pack…</Center>;

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: "var(--bg)", padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div className="no-print" style={{ width: 860, maxWidth: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => window.close()}>Close</button>
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: "auto", fontSize: 12 }}>
            {PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={csv}><Icon d={I.download} size={13} /> Download CSVs</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Icon d={I.download} size={13} /> Save / Print PDF</button>
        </div>
      </div>
      <AuditPackView pack={pack} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 14, padding: 24, textAlign: "center" }}>{children}</div>;
}
