"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, I, Avatar, Eyebrow, SectionHeader } from "@/components/primitives";
import { useApp, TWEAK_DEFAULTS, type Tweaks } from "@/providers/app";
import { api, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const { user, tweak, setTweak } = useApp();
  const router = useRouter();
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async () => {
    setPwMsg(null);
    setPwBusy(true);
    try {
      await api.auth.changePassword(curPw, newPw);
      setPwMsg({ ok: true, text: "Password updated." });
      setCurPw("");
      setNewPw("");
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof ApiError ? e.message : "Could not update password" });
    } finally {
      setPwBusy(false);
    }
  };

  const logout = async () => {
    await api.auth.logout().catch(() => {});
    router.replace("/login");
  };

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <div>
        <Eyebrow>System</Eyebrow>
        <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>Settings</div>
      </div>

      {/* Account */}
      <div className="surface" style={{ padding: "16px 18px" }}>
        <SectionHeader title="Account" subtitle="Your studio profile" />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <Avatar name={user.name} bg={user.bg} size={52} ring="var(--accent)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{user.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-sub)" }}>{user.title} · {user.email}</div>
          </div>
          <span style={{ fontSize: 10.5, color: "var(--accent-soft)", fontFamily: "'Geist Mono', monospace", padding: "3px 9px", borderRadius: 99, background: "color-mix(in oklab, var(--accent) 14%, transparent)", border: "1px solid var(--border-hi)", textTransform: "uppercase" }}>{user.appRole}</span>
        </div>
      </div>

      {/* Appearance */}
      <div className="surface" style={{ padding: "16px 18px" }}>
        <SectionHeader title="Appearance" subtitle="Personalize your workspace" />
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="Theme">
            <Seg value={tweak.theme} options={[["dark", "Dark"], ["light", "Light"]]} onChange={(v) => setTweak("theme", v)} />
          </Row>
          <Row label="Accent">
            <div style={{ display: "flex", gap: 8 }}>
              {["#a855f7", "#06b6d4", "#ec4899", "#10b981", "#f59e0b"].map((c) => (
                <button key={c} onClick={() => setTweak("accent", c)} style={{ width: 24, height: 24, borderRadius: 99, background: c, cursor: "pointer", border: tweak.accent === c ? "2px solid var(--text)" : "2px solid transparent", boxShadow: tweak.accent === c ? `0 0 0 2px ${c}` : "none" }} />
              ))}
            </div>
          </Row>
          <Row label="Density">
            <Seg value={tweak.density} options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} onChange={(v) => setTweak("density", v)} />
          </Row>
          <Row label="Sidebar">
            <Seg value={tweak.sidebar} options={[["expanded", "Expanded"], ["collapsed", "Collapsed"]]} onChange={(v) => setTweak("sidebar", v)} />
          </Row>
        </div>
      </div>

      {/* Modules */}
      <div className="surface" style={{ padding: "16px 18px" }}>
        <SectionHeader title="Modules" subtitle="Show or hide optional workspace areas" />
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Time tracking"><Toggle value={tweak.showTime} onChange={(v) => setTweak("showTime", v)} /></Row>
          <Row label="Clients"><Toggle value={tweak.showClients} onChange={(v) => setTweak("showClients", v)} /></Row>
          <Row label="Invoices"><Toggle value={tweak.showInvoices} onChange={(v) => setTweak("showInvoices", v)} /></Row>
          <Row label="Reports"><Toggle value={tweak.showReports} onChange={(v) => setTweak("showReports", v)} /></Row>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <button
            className="btn"
            onClick={() => {
              const accents = ["#a855f7", "#06b6d4", "#ec4899", "#10b981", "#f59e0b"];
              const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
              setTweak({
                theme: pick(["dark", "light"]) as Tweaks["theme"],
                accent: pick(accents),
                sidebar: pick(["expanded", "collapsed"]) as Tweaks["sidebar"],
                density: pick(["comfortable", "compact"]) as Tweaks["density"],
              });
            }}
          >
            🎲 Surprise me
          </button>
          <button className="btn btn-ghost" onClick={() => setTweak({ ...TWEAK_DEFAULTS })}>Reset to defaults</button>
        </div>
      </div>

      {/* Security */}
      <div className="surface" style={{ padding: "16px 18px" }}>
        <SectionHeader title="Security" subtitle="Change your password" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 }}>Current password</label>
            <input className="input" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 }}>New password</label>
            <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ fontSize: 12, color: pwMsg ? (pwMsg.ok ? "var(--success)" : "var(--danger)") : "transparent" }}>{pwMsg?.text ?? "."}</span>
          <button className="btn btn-primary" onClick={changePassword} disabled={pwBusy || !curPw || newPw.length < 6}>{pwBusy ? "Updating…" : "Update password"}</button>
        </div>
      </div>

      {/* Session */}
      <div className="surface" style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 600 }}>Session</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>Signed in via secure cookie session.</div>
        </div>
        <button className="btn" onClick={logout} style={{ color: "var(--danger)", borderColor: "color-mix(in oklab, var(--danger) 30%, transparent)" }}>
          <Icon d={I.lock} size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "var(--text-sub)" }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", padding: 2, background: value ? "var(--accent-grad)" : "var(--surface-hi)", transition: "all .15s", display: "flex", justifyContent: value ? "flex-end" : "flex-start" }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 99, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
    </button>
  );
}

function Seg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{ padding: "5px 13px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", color: value === v ? "#fff" : "var(--text-sub)", background: value === v ? "var(--accent-grad)" : "transparent" }}>{l}</button>
      ))}
    </div>
  );
}
