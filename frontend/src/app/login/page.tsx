"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Icon, I } from "@/components/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in, skip straight to the app.
  useEffect(() => {
    api.auth
      .me()
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="ambient-bg" style={center}>
        <Icon d={I.refresh} size={22} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="ambient-bg" style={center}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 480,
            height: 480,
            background: "radial-gradient(circle, var(--accent), transparent 60%)",
            opacity: 0.18,
            filter: "blur(40px)",
          }}
        />
      </div>

      <form onSubmit={submit} className="surface-frosted fade-up" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--accent-grad-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 19,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "'Inter Tight', sans-serif",
              boxShadow: "0 0 0 1px rgba(255,255,255,.18) inset, 0 8px 24px color-mix(in oklab, var(--accent) 50%, transparent)",
            }}
          >
            T
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.3 }}>
              Silifton
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Studio workspace</div>
          </div>
        </div>

        <div className="italic-serif" style={{ fontSize: 30, letterSpacing: -0.5, marginTop: 8 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-sub)", marginBottom: 8 }}>
          Sign in to your project + time workspace.
        </div>

        <label style={label}>Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@silifton.com"
          autoComplete="email"
        />

        <label style={label}>Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {error && (
          <div
            style={{
              fontSize: 12,
              color: "var(--danger)",
              background: "color-mix(in oklab, var(--danger) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--danger) 30%, transparent)",
              padding: "8px 11px",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: "center", padding: "11px", marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <Icon d={I.arrow} size={14} />}
        </button>

        <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 4 }}>
          New here? <Link href="/register" style={{ color: "var(--accent-soft)" }}>Create an account</Link>
        </div>
      </form>
    </div>
  );
}

const center: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
};
const card: React.CSSProperties = {
  width: 380,
  maxWidth: "100%",
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  position: "relative",
  zIndex: 1,
  boxShadow: "0 24px 60px rgba(0,0,0,.4)",
};
const label: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-sub)",
  fontWeight: 600,
  marginTop: 6,
  marginBottom: -2,
};
