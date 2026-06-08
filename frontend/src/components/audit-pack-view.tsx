"use client";

import type { AuditPack } from "@/lib/types";

// Print-friendly audit document (light theme, fixed colors so it prints clean
// regardless of app theme). Shared by the export page and the public portal.
const bdt = (n: number) => `৳${Math.round(n).toLocaleString()}`;

const C = {
  ink: "#15101f",
  sub: "#555",
  dim: "#888",
  line: "#eee",
  line2: "#f2f2f2",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26, breakInside: "avoid" }}>
      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", textTransform: "uppercase", letterSpacing: 0.6, color: C.ink, borderBottom: `2px solid ${C.ink}`, paddingBottom: 6, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Line({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", paddingLeft: indent ? 14 : 0, fontSize: bold ? 13 : 12.5, fontWeight: bold ? 700 : 400, color: bold ? C.ink : C.sub, borderTop: bold ? `1px solid ${C.ink}` : "none" }}>
      <span>{label}</span>
      <span style={{ fontFamily: "'Geist Mono', monospace" }}>{value}</span>
    </div>
  );
}

export function AuditPackView({ pack }: { pack: AuditPack }) {
  const s = pack.statements;
  return (
    <div className="print-area" style={{ width: 860, maxWidth: "100%", background: "#fff", color: C.ink, borderRadius: 12, padding: "44px 48px", fontFamily: "'Geist', sans-serif", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
      {/* Cover */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${C.line}`, paddingBottom: 22 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: "linear-gradient(135deg,#a855f7,#f472b6,#fbbf24)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif" }}>T</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif" }}>{pack.company.name}</div>
            <div style={{ fontSize: 11.5, color: C.dim }}>{pack.company.address} · BIN {pack.company.bin}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.5 }}>AUDIT PACK</div>
          <div style={{ fontSize: 12.5, color: C.sub }}>{s.period.label}</div>
          <div style={{ fontSize: 11, color: C.dim }}>Generated {new Date(pack.generatedAt).toLocaleDateString("en-GB")}</div>
          {pack.share && <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}>Shared by {pack.share.sharedBy} · expires {new Date(pack.share.expiresAt).toLocaleDateString("en-GB")}</div>}
        </div>
      </div>

      {/* P&L */}
      <Section title="Profit & Loss">
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>Income</div>
        {s.pnl.income.map((r) => <Line key={r.code} label={`${r.code} · ${r.name}`} value={bdt(r.amount)} indent />)}
        <Line label="Total income" value={bdt(s.pnl.totalIncome)} bold />
        <div style={{ fontSize: 11, color: C.dim, margin: "10px 0 4px" }}>Expenses</div>
        {s.pnl.expense.map((r) => <Line key={r.code} label={`${r.code} · ${r.name}`} value={bdt(r.amount)} indent />)}
        <Line label="Total expenses" value={bdt(s.pnl.totalExpense)} bold />
        <Line label={s.pnl.netProfit >= 0 ? "Net profit" : "Net loss"} value={bdt(s.pnl.netProfit)} bold />
      </Section>

      {/* Balance Sheet */}
      <Section title="Balance Sheet">
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>Assets</div>
        {s.balanceSheet.assets.map((r) => <Line key={r.code} label={`${r.code} · ${r.name}`} value={bdt(r.amount)} indent />)}
        <Line label="Total assets" value={bdt(s.balanceSheet.totalAssets)} bold />
        <div style={{ fontSize: 11, color: C.dim, margin: "10px 0 4px" }}>Liabilities</div>
        {s.balanceSheet.liabilities.map((r) => <Line key={r.code} label={`${r.code} · ${r.name}`} value={bdt(r.amount)} indent />)}
        <Line label="Total liabilities" value={bdt(s.balanceSheet.totalLiabilities)} bold />
        <div style={{ fontSize: 11, color: C.dim, margin: "10px 0 4px" }}>Equity</div>
        {s.balanceSheet.equity.map((r) => <Line key={r.code + r.name} label={r.name} value={bdt(r.amount)} indent />)}
        <Line label="Total equity" value={bdt(s.balanceSheet.totalEquity)} bold />
        <Line label="Liabilities + Equity" value={bdt(s.balanceSheet.totalLiabilities + s.balanceSheet.totalEquity)} bold />
        <div style={{ fontSize: 11, color: s.balanceSheet.balanced ? "#0a7d4b" : "#c0344d", marginTop: 6 }}>{s.balanceSheet.balanced ? "✓ Balanced" : "⚠ Out of balance"}</div>
      </Section>

      {/* Cash Flow */}
      <Section title="Cash Flow">
        <Line label="Opening balance" value={bdt(s.cashFlow.opening)} />
        <Line label="Operating activities" value={bdt(s.cashFlow.operating)} indent />
        <Line label="Investing activities" value={bdt(s.cashFlow.investing)} indent />
        <Line label="Financing activities" value={bdt(s.cashFlow.financing)} indent />
        <Line label="Net cash movement" value={bdt(s.cashFlow.net)} bold />
        <Line label="Closing balance" value={bdt(s.cashFlow.closing)} bold />
      </Section>

      {/* VAT */}
      <Section title="VAT Return (NBR)">
        <Line label="Output VAT (sales)" value={bdt(s.vat.outputVat)} />
        <Line label="Input VAT (purchases)" value={bdt(s.vat.inputVat)} />
        <Line label={s.vat.netPayable >= 0 ? "Net VAT payable" : "Net VAT reclaimable"} value={bdt(Math.abs(s.vat.netPayable))} bold />
      </Section>

      {/* Trial Balance */}
      <Section title="Trial Balance">
        <Table head={["Code", "Account", "Debit", "Credit"]} alignRight={[2, 3]}>
          {pack.trialBalance.rows.map((r) => (
            <Tr key={r.code} cells={[r.code, r.name, r.debit ? bdt(r.debit) : "—", r.credit ? bdt(r.credit) : "—"]} alignRight={[2, 3]} />
          ))}
          <Tr cells={["", "Totals", bdt(pack.trialBalance.totalDebit), bdt(pack.trialBalance.totalCredit)]} alignRight={[2, 3]} bold />
        </Table>
      </Section>

      {/* Fixed assets */}
      <Section title="Fixed Asset Register">
        <Table head={["Asset", "Category", "Cost", "Accum. dep.", "Net book value"]} alignRight={[2, 3, 4]}>
          {pack.assets.map((a) => (
            <Tr key={a.id} cells={[a.name, a.category, bdt(a.cost), bdt(a.accumulatedDepreciation), bdt(a.netBookValue)]} alignRight={[2, 3, 4]} />
          ))}
        </Table>
      </Section>

      {/* AR aging */}
      <Section title="Accounts Receivable">
        <Table head={["Invoice", "Client", "Status", "Due", "Amount"]} alignRight={[4]}>
          {pack.arAging.map((r) => (
            <Tr key={r.id} cells={[r.id, r.client, r.status, r.dueIn, `${r.currency === "BDT" ? "৳" : "$"}${r.amount.toLocaleString()}`]} alignRight={[4]} />
          ))}
          {pack.arAging.length === 0 && <Tr cells={["—", "Nothing outstanding", "", "", ""]} alignRight={[4]} />}
        </Table>
      </Section>

      {/* General ledger */}
      <Section title="General Ledger">
        {pack.generalLedger.map((e) => (
          <div key={e.id} style={{ marginBottom: 8, breakInside: "avoid" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600 }}>
              <span><span style={{ color: C.dim, fontFamily: "'Geist Mono', monospace" }}>{e.id}</span> {e.memo}</span>
              <span style={{ color: C.dim, fontFamily: "'Geist Mono', monospace" }}>{e.date}</span>
            </div>
            {e.lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", fontSize: 11.5, color: C.sub, paddingLeft: 10 }}>
                <span style={{ paddingLeft: l.credit ? 14 : 0 }}>{l.account}</span>
                <span style={{ textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>{l.debit ? bdt(l.debit) : ""}</span>
                <span style={{ textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>{l.credit ? bdt(l.credit) : ""}</span>
              </div>
            ))}
          </div>
        ))}
      </Section>

      {/* Audit trail */}
      <Section title="Audit Trail (recent)">
        <Table head={["When", "Actor", "Action", "Entity"]} alignRight={[]}>
          {pack.auditLog.slice(0, 40).map((a) => (
            <Tr key={a.id} cells={[new Date(a.at).toLocaleString("en-GB"), a.actorName, a.action, a.entityId ? `${a.entity} ${a.entityId}` : a.entity]} alignRight={[]} />
          ))}
        </Table>
      </Section>

      <div style={{ marginTop: 30, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.dim, textAlign: "center" }}>
        Prepared from Silifton books · double-entry verified · figures in BDT. For audit/RJSC review.
      </div>
    </div>
  );
}

function Table({ head, alignRight, children }: { head: string[]; alignRight: number[]; children: React.ReactNode }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
      <thead>
        <tr style={{ color: C.dim, textAlign: "left", borderBottom: `1.5px solid ${C.line}` }}>
          {head.map((h, i) => <th key={i} style={{ padding: "6px 4px", textAlign: alignRight.includes(i) ? "right" : "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Tr({ cells, alignRight, bold }: { cells: string[]; alignRight: number[]; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.line2}`, fontWeight: bold ? 700 : 400, color: bold ? C.ink : C.sub }}>
      {cells.map((c, i) => <td key={i} style={{ padding: "6px 4px", textAlign: alignRight.includes(i) ? "right" : "left", fontFamily: alignRight.includes(i) ? "'Geist Mono', monospace" : "inherit" }}>{c}</td>)}
    </tr>
  );
}
