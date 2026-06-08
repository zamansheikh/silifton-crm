"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppProvider } from "@/providers/app";
import { Shell } from "@/components/shell";
import { Icon, I } from "@/components/primitives";
import type { AuthUser } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");

  useEffect(() => {
    api.auth
      .me()
      .then(({ user }) => {
        setUser(user);
        setStatus("authed");
      })
      .catch(() => {
        setStatus("guest");
        router.replace("/login");
      });
  }, [router]);

  if (status !== "authed" || !user) {
    return (
      <div
        className="ambient-bg"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}
      >
        <Icon d={I.refresh} size={20} color="var(--accent-soft)" style={{ animation: "spin .8s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Loading workspace…</span>
      </div>
    );
  }

  return (
    <AppProvider user={user}>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
