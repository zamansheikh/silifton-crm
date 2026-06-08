"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { AuditPackView } from "@/components/audit-pack-view";
import { Icon, I } from "@/components/primitives";
import type { AuditPack } from "@/lib/types";

// Public, login-free read-only audit view (token-gated). Does NOT send any
// credentials — it relies solely on the share token in the URL.
export default function AuditPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [pack, setPack] = useState<AuditPack | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "expired" | "invalid">("loading");

  useEffect(() => {
    fetch(`${API_BASE}/api/public/audit/${token}`)
      .then(async (r) => {
        if (r.status === 410) return setState("expired");
        if (!r.ok) return setState("invalid");
        setPack(await r.json());
        setState("ok");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "loading") return <Center>Loading audit pack…</Center>;
  if (state === "expired") return <Center>This audit link has expired. Ask Silifton for a fresh link.</Center>;
  if (state === "invalid" || !pack) return <Center>This audit link is invalid.</Center>;

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: "var(--bg)", padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div className="no-print" style={{ width: 860, maxWidth: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-sub)" }}>
          <Icon d={I.lock} size={14} color="var(--accent-soft)" />
          Read-only audit access · {pack.share?.label} · expires {pack.share ? new Date(pack.share.expiresAt).toLocaleDateString("en-GB") : ""}
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}><Icon d={I.download} size={13} /> Save / Print PDF</button>
      </div>
      <AuditPackView pack={pack} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 14, padding: 24, textAlign: "center" }}>{children}</div>;
}
