"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, I, Eyebrow, SectionHeader } from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { DateField } from "@/components/date-field";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/format";
import { exportCsv } from "@/lib/export";
import type { Account, JournalEntry, JournalLine, TrialBalance, AccountType, Statements, StatementRow, PeriodsResponse, BankReconciliation, ShareLink } from "@/lib/types";

const TYPE_ORDER: AccountType[] = ["Asset", "Liability", "Equity", "Income", "Expense"];
const TYPE_COLOR: Record<AccountType, string> = {
  Asset: "var(--info)",
  Liability: "var(--warning)",
  Equity: "var(--accent)",
  Income: "var(--success)",
  Expense: "var(--danger)",
};
const SOURCE_COLOR: Record<string, string> = {
  invoice: "var(--success)",
  expense: "var(--danger)",
  manual: "var(--accent)",
};
const bdt = (n: number) => money(n, "BDT", false);

export default function AccountingPage() {
  const { role, perms, bump } = useApp();
  const [tab, setTab] = useState<"trial" | "pnl" | "balance" | "cash" | "vat" | "reconcile" | "journal" | "coa" | "periods">("trial");
  const [period, setPeriod] = useState("month");
  const [showCapital, setShowCapital] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [reconAccount, setReconAccount] = useState("1010");
  const [bankRec, setBankRec] = useState<BankReconciliation | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [stmt, setStmt] = useState<Statements | null>(null);
  const [periods, setPeriods] = useState<PeriodsResponse | null>(null);
  const [version, setVersion] = useState(0);
  const [showEntry, setShowEntry] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = perms.finance;
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    api.accounting.accounts().then(setAccounts).catch(() => {});
    api.accounting.journal().then(setJournal).catch(() => {});
    api.accounting.trialBalance().then(setTb).catch(() => {});
    api.accounting.periods().then(setPeriods).catch(() => {});
  }, [version]);

  const closePeriod = async (month: number) => {
    await api.accounting.closePeriod(month).catch(() => {});
    setToast("Period closed");
    reload();
  };
  const reopenPeriod = async (month: number) => {
    await api.accounting.reopenPeriod(month).catch(() => {});
    setToast("Period reopened");
    reload();
  };
  const toggleClear = async (entryId: string) => {
    await api.accounting.bankRecToggle(reconAccount, entryId).catch(() => {});
    loadRec();
  };
  const setStatementBalance = async (balance: number) => {
    await api.accounting.bankRecStatement(reconAccount, balance).catch(() => {});
    loadRec();
  };

  useEffect(() => {
    api.accounting.statements(period).then(setStmt).catch(() => {});
  }, [period, version]);

  const loadRec = () => api.accounting.bankRec(reconAccount).then(setBankRec).catch(() => {});
  useEffect(() => {
    if (tab === "reconcile") loadRec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, reconAccount, version]);

  const isStatement = tab === "pnl" || tab === "balance" || tab === "cash" || tab === "vat";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.code, a])), [accounts]);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api.accounting.sync();
      setToast(`Posted ${r.invoices} invoices + ${r.expenses} expenses`);
      reload();
      bump();
    } catch {
      setToast("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <Eyebrow>Operate</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Accounting
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· double-entry · BDT base</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isStatement && (
            <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: "auto", fontSize: 12 }}>
              <option value="month">May 2026</option>
              <option value="quarter">Q2 2026 · Apr–Jun</option>
              <option value="year">FY 2026</option>
              <option value="all">All time</option>
            </select>
          )}
          {role !== "dev" && <button className="btn" onClick={() => window.open(`/audit-pack?period=${period}`, "_blank")}><Icon d={I.download} size={12} /> Audit pack</button>}
          {perms.admin && <button className="btn" onClick={() => setShowShare(true)}><Icon d={I.share} size={12} /> Share</button>}
          {canManage && <button className="btn" onClick={sync} disabled={syncing}>{syncing ? <Icon d={I.refresh} size={12} style={{ animation: "spin .8s linear infinite" }} /> : <Icon d={I.refresh} size={12} />} Sync</button>}
          {canManage && tab === "journal" && <button className="btn" onClick={() => setShowCapital(true)}><Icon d={I.dollar} size={13} /> Record capital</button>}
          {canManage && tab === "journal" && <button className="btn btn-primary" onClick={() => setShowEntry(true)}><Icon d={I.plus} size={13} /> Journal entry</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 9, padding: 3, width: "fit-content", flexWrap: "wrap" }}>
        {([["trial", "Trial Balance"], ["pnl", "P&L"], ["balance", "Balance Sheet"], ["cash", "Cash Flow"], ["vat", "VAT"], ["reconcile", "Reconcile"], ["journal", "Journal"], ["coa", "Chart of Accounts"], ["periods", "Periods"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "6px 14px", fontSize: 12.5, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", color: tab === k ? "#fff" : "var(--text-sub)", background: tab === k ? "var(--accent-grad)" : "transparent" }}>{l}</button>
        ))}
      </div>

      {tab === "trial" && tb && (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader title="Trial Balance" subtitle="All posted entries · base BDT" />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: tb.balanced ? "var(--success)" : "var(--danger)", padding: "4px 10px", borderRadius: 99, background: `color-mix(in oklab, ${tb.balanced ? "var(--success)" : "var(--danger)"} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${tb.balanced ? "var(--success)" : "var(--danger)"} 30%, transparent)` }}>
                <Icon d={tb.balanced ? I.check : I.x} size={12} /> {tb.balanced ? "Balanced" : "Out of balance"}
              </span>
              <button className="btn" onClick={() => exportCsv("trial-balance.csv", tb.rows.map((r) => ({ code: r.code, account: r.name, type: r.type, debit: r.debit, credit: r.credit })))}><Icon d={I.download} size={12} /> Export</button>
            </div>
          </div>
          <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px 140px 140px", gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
            {["Code", "Account", "Type", "Debit", "Credit"].map((h, i) => <Eyebrow key={h} size={10} style={i > 2 ? { textAlign: "right" } : undefined}>{h}</Eyebrow>)}
          </div>
          {tb.rows.map((r, i) => (
            <div key={r.code} className="rt-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px 140px 140px", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <span className="mono" data-label="Code" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{r.code}</span>
              <span data-label="Account" style={{ fontSize: 12.5, color: "var(--text)" }}>{r.name}</span>
              <span data-label="Type" style={{ fontSize: 10.5, color: TYPE_COLOR[r.type], fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${TYPE_COLOR[r.type]} 14%, transparent)`, justifySelf: "start" }}>{r.type}</span>
              <span data-label="Debit" style={{ fontSize: 12.5, color: r.debit ? "var(--text)" : "var(--text-soft)", fontFamily: "'Geist Mono', monospace", textAlign: "right" }}>{r.debit ? bdt(r.debit) : "—"}</span>
              <span data-label="Credit" style={{ fontSize: 12.5, color: r.credit ? "var(--text)" : "var(--text-soft)", fontFamily: "'Geist Mono', monospace", textAlign: "right" }}>{r.credit ? bdt(r.credit) : "—"}</span>
            </div>
          ))}
          <div className="rt-row" style={{ display: "grid", gridTemplateColumns: "80px 1fr 110px 140px 140px", gap: 12, padding: "12px 18px", borderTop: "2px solid var(--border-hi)", background: "var(--surface)" }}>
            <span /><Eyebrow color="var(--text)">Totals</Eyebrow><span />
            <span data-label="Total debit" style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", textAlign: "right" }}>{bdt(tb.totalDebit)}</span>
            <span data-label="Total credit" style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", textAlign: "right" }}>{bdt(tb.totalCredit)}</span>
          </div>
        </div>
      )}

      {tab === "pnl" && stmt && (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="Profit & Loss" subtitle={`Income statement · ${stmt.period.label}`} />
          </div>
          <StatementGroup title="Income" rows={stmt.pnl.income} total={stmt.pnl.totalIncome} color="var(--success)" />
          <StatementGroup title="Expenses" rows={stmt.pnl.expense} total={stmt.pnl.totalExpense} color="var(--danger)" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "2px solid var(--border-hi)", background: "var(--surface)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif" }}>Net {stmt.pnl.netProfit >= 0 ? "profit" : "loss"}</span>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: stmt.pnl.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>{bdt(stmt.pnl.netProfit)}</span>
          </div>
        </div>
      )}

      {tab === "balance" && stmt && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="surface" style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader title="Balance Sheet" subtitle={`As of ${stmt.period.label}`} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: stmt.balanceSheet.balanced ? "var(--success)" : "var(--danger)", padding: "4px 10px", borderRadius: 99, background: `color-mix(in oklab, ${stmt.balanceSheet.balanced ? "var(--success)" : "var(--danger)"} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${stmt.balanceSheet.balanced ? "var(--success)" : "var(--danger)"} 30%, transparent)` }}>
              <Icon d={stmt.balanceSheet.balanced ? I.check : I.x} size={12} /> {stmt.balanceSheet.balanced ? "Balanced" : "Out of balance"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="surface" style={{ overflow: "hidden" }}>
              <StatementGroup title="Assets" rows={stmt.balanceSheet.assets} total={stmt.balanceSheet.totalAssets} color="var(--info)" />
            </div>
            <div className="surface" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <StatementGroup title="Liabilities" rows={stmt.balanceSheet.liabilities} total={stmt.balanceSheet.totalLiabilities} color="var(--warning)" />
              <StatementGroup title="Equity" rows={stmt.balanceSheet.equity} total={stmt.balanceSheet.totalEquity} color="var(--accent)" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "2px solid var(--border-hi)", background: "var(--surface)", marginTop: "auto" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Liabilities + Equity</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: "var(--text)" }}>{bdt(stmt.balanceSheet.totalLiabilities + stmt.balanceSheet.totalEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "cash" && stmt && (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="Cash Flow" subtitle={`Cash & bank movement · ${stmt.period.label}`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
            {[["Opening", stmt.cashFlow.opening, "var(--text-dim)"], ["Inflows", stmt.cashFlow.inflows, "var(--success)"], ["Outflows", -stmt.cashFlow.outflows, "var(--danger)"], ["Closing", stmt.cashFlow.closing, "var(--accent-soft)"]].map(([l, v, c], i) => (
              <div key={l as string} style={{ padding: "14px 18px", borderLeft: i ? "1px solid var(--border)" : "none" }}>
                <Eyebrow>{l as string}</Eyebrow>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: c as string, marginTop: 4 }}>{bdt(v as number)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: "1px solid var(--border)" }}>
            {([["Operating", stmt.cashFlow.operating], ["Investing", stmt.cashFlow.investing], ["Financing", stmt.cashFlow.financing]] as const).map(([l, v], i) => (
              <div key={l} style={{ padding: "12px 18px", borderLeft: i ? "1px solid var(--border)" : "none" }}>
                <Eyebrow>{l} activities</Eyebrow>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: v >= 0 ? "var(--success)" : "var(--danger)", marginTop: 4 }}>{v >= 0 ? "+" : ""}{bdt(v)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)" }}><Eyebrow>Movements</Eyebrow></div>
          {stmt.cashFlow.movements.map((m, i) => (
            <div key={m.id} className="rt-row" style={{ display: "grid", gridTemplateColumns: "70px 1fr 140px", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <span data-label="Date" style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{m.date}</span>
              <span data-label="Memo" style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.memo}</span>
              <span data-label="Amount" style={{ textAlign: "right", fontSize: 12.5, fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: m.amount > 0 ? "var(--success)" : "var(--danger)" }}>{m.amount > 0 ? "+" : ""}{bdt(m.amount)}</span>
            </div>
          ))}
          {stmt.cashFlow.movements.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No cash movement in this period.</div>}
        </div>
      )}

      {tab === "vat" && stmt && (
        <div className="surface" style={{ overflow: "hidden", maxWidth: 620 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="VAT return" subtitle={`NBR summary · ${stmt.period.label}`} />
          </div>
          <Row2 k="Output VAT (on sales)" v={bdt(stmt.vat.outputVat)} sub="2100 · collected from clients" />
          <Row2 k="Input VAT (on purchases)" v={bdt(stmt.vat.inputVat)} sub="1200 · paid to vendors, reclaimable" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "2px solid var(--border-hi)", background: "var(--surface)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif" }}>{stmt.vat.netPayable >= 0 ? "Net VAT payable to NBR" : "Net VAT reclaimable"}</span>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: stmt.vat.netPayable >= 0 ? "var(--warning)" : "var(--success)" }}>{bdt(Math.abs(stmt.vat.netPayable))}</span>
          </div>
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-dim)" }}>
            Standard Bangladesh VAT is 15%. Output − Input = net payable for the period. File with NBR via Mushak 9.1.
          </div>
        </div>
      )}

      {tab === "reconcile" && bankRec && (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <SectionHeader title="Bank reconciliation" subtitle="Tick entries that appear on your bank statement" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select className="input" value={reconAccount} onChange={(e) => setReconAccount(e.target.value)} style={{ width: "auto", fontSize: 12 }}>
                {bankRec.accounts.map((a) => <option key={a} value={a}>{accountById[a]?.name ?? a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderBottom: "1px solid var(--border)" }}>
            {[["Ledger balance", bankRec.ledgerBalance, "var(--text)"], ["Cleared", bankRec.clearedBalance, "var(--success)"], ["Statement", bankRec.statementBalance, "var(--accent-soft)"], ["Difference", bankRec.difference, bankRec.difference === 0 ? "var(--success)" : "var(--danger)"]].map(([l, v, c], i) => (
              <div key={l as string} style={{ padding: "12px 18px", borderLeft: i ? "1px solid var(--border)" : "none" }}>
                <Eyebrow>{l as string}</Eyebrow>
                {l === "Statement" && canManage ? (
                  <input className="input" type="number" defaultValue={bankRec.statementBalance} onBlur={(e) => setStatementBalance(Number(e.target.value))} style={{ marginTop: 4, padding: "4px 8px", fontSize: 14, fontFamily: "'Inter Tight', sans-serif" }} />
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: c as string, marginTop: 4 }}>{bdt(v as number)}</div>
                )}
              </div>
            ))}
          </div>
          {bankRec.difference === 0 && bankRec.statementBalance !== 0 && (
            <div style={{ padding: "8px 18px", background: "color-mix(in oklab, var(--success) 10%, transparent)", color: "var(--success)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={I.check} size={12} /> Reconciled — cleared balance matches the statement.
            </div>
          )}
          {bankRec.lines.map((l, i) => (
            <div key={l.entryId} className="rt-row" style={{ display: "grid", gridTemplateColumns: "40px 70px 1fr 130px", gap: 12, padding: "10px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center", opacity: l.cleared ? 1 : 0.85 }}>
              <button onClick={() => canManage && toggleClear(l.entryId)} disabled={!canManage} style={{ width: 18, height: 18, borderRadius: 5, background: l.cleared ? "var(--accent-grad)" : "transparent", border: l.cleared ? "none" : "1.5px solid var(--border-hi)", cursor: canManage ? "pointer" : "default", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                {l.cleared && <Icon d={I.check} size={10} color="#fff" stroke={2.5} />}
              </button>
              <span data-label="Date" style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{l.date}</span>
              <span data-label="Memo" style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.memo}</span>
              <span data-label="Amount" style={{ textAlign: "right", fontSize: 12.5, fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: l.amount > 0 ? "var(--success)" : "var(--danger)" }}>{l.amount > 0 ? "+" : ""}{bdt(l.amount)}</span>
            </div>
          ))}
          {bankRec.lines.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No movements on this account.</div>}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-dim)", background: "var(--surface)" }}>
            Enter your bank statement closing balance, then tick each entry that appears on it. Difference reaches zero when the books match the bank. (Live bank-feed import plugs in here.)
          </div>
        </div>
      )}

      {tab === "periods" && periods && (
        <div className="surface" style={{ overflow: "hidden", maxWidth: 720 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="Accounting periods" subtitle="Lock closed months so the books stay frozen for audit" />
          </div>
          {periods.months.map((p, i) => (
            <div key={p.month} className="rt-row" style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 110px", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{p.label}</span>
              <span data-label="Entries" style={{ fontSize: 11.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{p.entries} entries</span>
              <span data-label="Status" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: p.closed ? "var(--warning)" : "var(--success)", justifySelf: "start" }}>
                <Icon d={p.closed ? I.lock : I.check} size={12} /> {p.closed ? "Closed" : "Open"}
              </span>
              {perms.admin ? (
                p.closed ? (
                  <button className="btn btn-ghost" style={{ fontSize: 11.5, justifySelf: "end" }} onClick={() => reopenPeriod(p.month)}>Reopen</button>
                ) : (
                  <button className="btn" style={{ fontSize: 11.5, justifySelf: "end" }} onClick={() => closePeriod(p.month)}>Close</button>
                )
              ) : (
                <span style={{ fontSize: 10.5, color: "var(--text-dim)", justifySelf: "end" }}>founder only</span>
              )}
            </div>
          ))}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-dim)", background: "var(--surface)" }}>
            Closing a month locks every invoice, expense, and journal entry dated in it (and earlier). The ledger sync skips closed periods, keeping audited books immutable.
          </div>
        </div>
      )}

      {tab === "journal" && (
        <div className="surface" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <SectionHeader title="General Journal" subtitle={`${journal.length} entries · newest first`} />
          </div>
          {journal.map((e, i) => (
            <div key={e.id} style={{ padding: "12px 18px", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--accent-soft)" }}>{e.id}</span>
                <span style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.memo}</span>
                <span style={{ fontSize: 10, color: SOURCE_COLOR[e.source], fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${SOURCE_COLOR[e.source]} 14%, transparent)`, textTransform: "uppercase" }}>{e.source}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{e.date}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 12 }}>
                {e.lines.map((l, j) => (
                  <div key={j} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 12, fontSize: 12 }}>
                    <span style={{ color: l.credit ? "var(--text-sub)" : "var(--text)", paddingLeft: l.credit ? 18 : 0 }}>
                      <span className="mono" style={{ color: "var(--text-dim)", marginRight: 6 }}>{l.account}</span>
                      {accountById[l.account]?.name ?? l.account}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "'Geist Mono', monospace", color: l.debit ? "var(--text)" : "var(--text-soft)" }}>{l.debit ? bdt(l.debit) : ""}</span>
                    <span style={{ textAlign: "right", fontFamily: "'Geist Mono', monospace", color: l.credit ? "var(--text)" : "var(--text-soft)" }}>{l.credit ? bdt(l.credit) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {journal.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No journal entries. Hit “Sync”.</div>}
        </div>
      )}

      {tab === "coa" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {TYPE_ORDER.map((type) => {
            const rows = accounts.filter((a) => a.type === type);
            if (!rows.length) return null;
            return (
              <div key={type} className="surface" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[type] }} />
                  <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{type}</span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{rows.length}</span>
                </div>
                {rows.map((a, i) => (
                  <div key={a.code} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px", gap: 12, padding: "9px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{a.code}</span>
                    <span style={{ fontSize: 12.5, color: "var(--text)" }}>{a.name}</span>
                    <span style={{ fontSize: 10.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", justifySelf: "end" }}>{a.normal}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showEntry && (
        <JournalModal accounts={accounts} onClose={() => setShowEntry(false)} onSaved={() => { reload(); setShowEntry(false); }} />
      )}
      {showCapital && (
        <CapitalModal accounts={accounts} onClose={() => setShowCapital(false)} onSaved={() => { reload(); setToast("Capital recorded"); setShowCapital(false); }} />
      )}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 90, background: "var(--bg-elevate)", border: "1px solid var(--border-hi)", borderRadius: 10, padding: "10px 16px", fontSize: 12.5, color: "var(--text)", boxShadow: "0 12px 32px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={I.check} size={13} color="var(--success)" /> {toast}
        </div>
      )}
    </div>
  );
}

function Row2({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13, color: "var(--text)" }}>{k}</div>
        {sub && <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 14, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function CapitalModal({ accounts, onClose, onSaved }: { accounts: Account[]; onClose: () => void; onSaved: () => void }) {
  const cashAccounts = accounts.filter((a) => ["1000", "1010", "1020"].includes(a.code));
  const equityAccounts = accounts.filter((a) => a.type === "Equity");
  const [amount, setAmount] = useState(0);
  const [toAccount, setToAccount] = useState("1010");
  const [equity, setEquity] = useState("3000");
  const [memo, setMemo] = useState("Initial share capital");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.accounting.createJournal({
        memo,
        lines: [
          { account: toAccount, debit: amount, credit: 0 },
          { account: equity, debit: 0, credit: amount },
        ],
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not record capital");
      setBusy(false);
    }
  };

  return (
    <Modal title="Record capital / investment" subtitle="Posts a balanced entry: cash in ↑, equity ↑" onClose={onClose} width={460}>
      <Field label="Amount (BDT)"><input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Deposited to">
          <select className="input" value={toAccount} onChange={(e) => setToAccount(e.target.value)}>
            {cashAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        <Field label="Equity account">
          <select className="input" value={equity} onChange={(e) => setEquity(e.target.value)}>
            {equityAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Memo"><input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} /></Field>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 12, fontSize: 12, color: "var(--text-sub)" }}>
        <span>DR {accounts.find((a) => a.code === toAccount)?.name}</span>
        <span>CR {accounts.find((a) => a.code === equity)?.name}</span>
      </div>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || amount <= 0}>{busy ? "Posting…" : "Record capital"}</button>
      </div>
    </Modal>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [period, setPeriod] = useState("year");
  const [days, setDays] = useState(14);
  const [label, setLabel] = useState("External auditor");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => api.accounting.shares().then(setShares).catch(() => {});
  useEffect(() => { load(); }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlFor = (t: string) => `${origin}/audit-portal/${t}`;

  const create = async () => {
    setBusy(true);
    try {
      const r = await api.accounting.share({ period, days, label });
      await navigator.clipboard.writeText(urlFor(r.token)).catch(() => {});
      setCopied(r.token);
      load();
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (t: string) => {
    await api.accounting.revokeShare(t).catch(() => {});
    load();
  };

  return (
    <Modal title="Share with auditor" subtitle="Create a read-only, expiring link — no login needed" onClose={onClose} width={560}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Period">
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="month">May 2026</option>
            <option value="quarter">Q2 2026</option>
            <option value="year">FY 2026</option>
            <option value="all">All time</option>
          </select>
        </Field>
        <Field label="Expires in (days)"><input className="input" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
        <Field label="Label"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
      </div>
      <button className="btn btn-primary" onClick={create} disabled={busy} style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
        <Icon d={I.share} size={13} /> {busy ? "Creating…" : "Create link (copies to clipboard)"}
      </button>

      <Eyebrow>Active links</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {shares.map((s) => (
          <div key={s.token} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", opacity: s.active ? 1 : 0.5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label} · {s.period}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>{s.active ? `expires ${new Date(s.expiresAt).toLocaleDateString("en-GB")}` : "expired"} · /audit-portal/{s.token.slice(0, 8)}…</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Copy link" onClick={() => { navigator.clipboard.writeText(urlFor(s.token)).catch(() => {}); setCopied(s.token); }}>
              <Icon d={copied === s.token ? I.check : I.copy} size={13} color={copied === s.token ? "var(--success)" : undefined} />
            </button>
            <button className="btn btn-ghost btn-icon" title="Revoke" onClick={() => revoke(s.token)}><Icon d={I.trash} size={13} /></button>
          </div>
        ))}
        {shares.length === 0 && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>No links yet.</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

function StatementGroup({ title, rows, total, color }: { title: string; rows: StatementRow[]; total: number; color: string }) {
  return (
    <div>
      <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: "var(--surface)" }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{title}</span>
      </div>
      {rows.map((r) => (
        <div key={r.code + r.name} style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", gap: 12, padding: "8px 18px", borderTop: "1px solid var(--border)", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.code}</span>
          <span style={{ fontSize: 12.5, color: "var(--text-sub)" }}>{r.name}</span>
          <span style={{ textAlign: "right", fontSize: 12.5, color: "var(--text)", fontFamily: "'Geist Mono', monospace" }}>{bdt(r.amount)}</span>
        </div>
      ))}
      {rows.length === 0 && <div style={{ padding: "8px 18px", fontSize: 12, color: "var(--text-dim)", borderTop: "1px solid var(--border)" }}>None.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, padding: "9px 18px", borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 600 }}>Total {title}</span>
        <span style={{ textAlign: "right", fontSize: 13, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{bdt(total)}</span>
      </div>
    </div>
  );
}

function JournalModal({ accounts, onClose, onSaved }: { accounts: Account[]; onClose: () => void; onSaved: () => void }) {
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { account: accounts[0]?.code ?? "", debit: 0, credit: 0 },
    { account: accounts[1]?.code ?? "", debit: 0, credit: 0 },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalD = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalC = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalD === totalC && totalD > 0;

  const setLine = (i: number, patch: Partial<JournalLine>) => setLines((p) => p.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((p) => [...p, { account: accounts[0]?.code ?? "", debit: 0, credit: 0 }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, j) => j !== i));

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.accounting.createJournal({
        memo,
        date: date || undefined,
        lines: lines.map((l) => ({ account: l.account, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not post entry");
      setBusy(false);
    }
  };

  return (
    <Modal title="New journal entry" subtitle="Manual double-entry — debits must equal credits" onClose={onClose} width={640}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
        <Field label="Memo"><input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Owner capital injection" autoFocus /></Field>
        <Field label="Date"><DateField value={date} onChange={setDate} placeholder="Today" /></Field>
      </div>

      <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 }}>Lines</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 28px", gap: 8 }}>
          <Eyebrow size={9}>Account</Eyebrow><Eyebrow size={9}>Debit</Eyebrow><Eyebrow size={9}>Credit</Eyebrow><span />
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 28px", gap: 8, alignItems: "center" }}>
            <select className="input" value={l.account} onChange={(e) => setLine(i, { account: e.target.value })} style={{ padding: "6px 9px", fontSize: 12 }}>
              {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            </select>
            <input className="input" type="number" value={l.debit || ""} onChange={(e) => setLine(i, { debit: Number(e.target.value), credit: 0 })} placeholder="0" style={{ padding: "6px 9px", fontSize: 12 }} />
            <input className="input" type="number" value={l.credit || ""} onChange={(e) => setLine(i, { credit: Number(e.target.value), debit: 0 })} placeholder="0" style={{ padding: "6px 9px", fontSize: 12 }} />
            <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeLine(i)} disabled={lines.length <= 2}><Icon d={I.x} size={11} /></button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ fontSize: 11.5, justifyContent: "flex-start", padding: "4px 6px", width: "fit-content" }} onClick={addLine}><Icon d={I.plus} size={11} /> Add line</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--surface)", border: `1px solid ${balanced ? "color-mix(in oklab, var(--success) 30%, transparent)" : "var(--border)"}`, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: balanced ? "var(--success)" : "var(--text-sub)", fontWeight: 600 }}>{balanced ? "Balanced" : `Diff ${bdt(Math.abs(totalD - totalC))}`}</span>
        <span style={{ fontSize: 12.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>DR {bdt(totalD)} · CR {bdt(totalC)}</span>
      </div>

      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !memo || !balanced}>{busy ? "Posting…" : "Post entry"}</button>
      </div>
    </Modal>
  );
}
