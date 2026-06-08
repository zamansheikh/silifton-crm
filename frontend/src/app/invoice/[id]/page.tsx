"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Invoice, Client } from "@/lib/types";

// Standalone, print-friendly invoice (no app chrome). Save as PDF via the
// browser's print dialog.
export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.invoices
      .get(id)
      .then(async (i) => {
        setInv(i);
        const c = await api.clients.get(i.client).catch(() => null);
        setClient(c);
      })
      .catch(() => setErr(true));
  }, [id]);

  if (err) return <Center>Invoice not found or you’re not signed in.</Center>;
  if (!inv) return <Center>Loading…</Center>;

  const sym = inv.currency === "BDT" ? "৳" : "$";

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: "var(--bg)", padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div className="no-print" style={{ width: 820, maxWidth: "100%", display: "flex", justifyContent: "space-between" }}>
        <button className="btn" onClick={() => window.close()}>Close</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Download / Print PDF</button>
      </div>

      <div className="print-area" style={{ width: 820, maxWidth: "100%", background: "#fff", color: "#15101f", borderRadius: 12, padding: "40px 44px", fontFamily: "'Geist', sans-serif", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #eee", paddingBottom: 22, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#a855f7,#f472b6,#fbbf24)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif" }}>T</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif" }}>Silifton Studio</div>
              <div style={{ fontSize: 11.5, color: "#777" }}>Banani, Dhaka · hello@silifton.com</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.5 }}>INVOICE</div>
            <div style={{ fontSize: 12.5, color: "#555", fontFamily: "'Geist Mono', monospace" }}>{inv.id}</div>
            <div style={{ marginTop: 6, display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: inv.status === "Paid" ? "#0a7d4b" : inv.status === "Overdue" ? "#c0344d" : "#5b54a8", background: inv.status === "Paid" ? "#e6f7ee" : inv.status === "Overdue" ? "#fdecef" : "#eeedfb" }}>{inv.status.toUpperCase()}</div>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "#999", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Geist Mono', monospace" }}>Bill to</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{client?.name ?? inv.client}</div>
            <div style={{ fontSize: 12.5, color: "#666" }}>{client?.industry}</div>
            <div style={{ fontSize: 12.5, color: "#666" }}>{client?.contact}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: "#555" }}>
            <div><b>Issued:</b> {inv.issued} 2026</div>
            <div><b>Due:</b> {inv.dueIn}</div>
            <div><b>Currency:</b> {inv.currency}</div>
            {inv.paidOn && <div><b>Paid:</b> {inv.paidOn} · {inv.paymentMethod}</div>}
          </div>
        </div>

        {/* Lines */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left", color: "#999", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8 }}>
              <th style={{ padding: "8px 0" }}>Description</th>
              <th style={{ padding: "8px 0", textAlign: "right", width: 60 }}>Qty</th>
              <th style={{ padding: "8px 0", textAlign: "right", width: 110 }}>Rate</th>
              <th style={{ padding: "8px 0", textAlign: "right", width: 130 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 0" }}>{l.description}</td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>{l.qty}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>{sym}{l.rate.toLocaleString()}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontFamily: "'Geist Mono', monospace" }}>{sym}{(l.qty * l.rate).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <div style={{ width: 280 }}>
            <Tot k="Subtotal" v={`${sym}${inv.subtotal.toLocaleString()}`} />
            <Tot k={`VAT (${inv.vatRate}%)`} v={`${sym}${inv.vat.toLocaleString()}`} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #15101f", marginTop: 6 }}>
              <span style={{ fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", fontSize: 15 }}>Total due</span>
              <span style={{ fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", fontSize: 18 }}>{money(inv.amount, inv.currency, false)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 34, paddingTop: 16, borderTop: "1px solid #eee", fontSize: 11.5, color: "#888", textAlign: "center" }}>
          Thank you for your business. Payable to Silifton Studio · BIN 0000000000.
        </div>
      </div>
    </div>
  );
}

function Tot({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555" }}>
      <span>{k}</span>
      <span style={{ fontFamily: "'Geist Mono', monospace" }}>{v}</span>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 14 }}>{children}</div>;
}
