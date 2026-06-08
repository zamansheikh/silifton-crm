"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon,
  I,
  Avatar,
  AvatarStack,
  Eyebrow,
  StatusPill,
  ProgressBar,
  SectionHeader,
  GlowOrb,
  PRIORITY_COLOR,
} from "@/components/primitives";
import { useApp } from "@/providers/app";
import { useTimer, formatHMS } from "@/providers/timer";
import { money } from "@/lib/format";
import { api } from "@/lib/api";
import type { DashboardData, ActivityItem, Project } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const Stat = ({
  label,
  value,
  sub,
  delta,
  deltaUp = true,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaUp?: boolean;
  color: string;
  icon: React.ReactNode;
}) => (
  <div style={{ padding: 1, borderRadius: 12, background: `linear-gradient(135deg, color-mix(in oklab, ${color} 50%, transparent), transparent 70%)` }}>
    <div style={{ background: "var(--bg)", borderRadius: 11, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, height: "100%", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -20, width: 90, height: 90, background: `radial-gradient(circle, ${color}, transparent 65%)`, opacity: 0.3, filter: "blur(15px)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `color-mix(in oklab, ${color} 22%, transparent)`, color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-sub)", fontWeight: 500 }}>{label}</span>
        </div>
        <span style={{ fontSize: 10.5, color: deltaUp ? "var(--success)" : "var(--danger)", fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>{deltaUp ? "↑" : "↓"} {delta}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, position: "relative" }}>
        <span style={{ fontSize: 28, color: "var(--text)", fontWeight: 600, letterSpacing: -0.8, fontFamily: "'Inter Tight', sans-serif" }}>{value}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{sub}</span>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user, clientById, teamById, projectById, openTask, version } = useApp();
  const { timer, displayMs, pause, resume, stop } = useTimer();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    api.dashboard().then(setData).catch(() => {});
    api.activity().then(setActivity).catch(() => {});
  }, [version]);

  const k = data?.kpis;
  const timerProject = timer ? projectById[timer.project] : undefined;

  const ProjRow = ({ p }: { p: Project }) => {
    const client = clientById[p.client];
    return (
      <div
        className="rt-row proj-card"
        onClick={() => router.push(`/projects/${p.id}`)}
        style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1.7fr 1fr 0.9fr 0.7fr 0.7fr", gap: 14, alignItems: "center", cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto", boxShadow: `0 4px 14px color-mix(in oklab, ${p.accent[0]} 35%, transparent)` }}>{p.code}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{client?.name}</div>
          </div>
        </div>
        <div data-label="Progress">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11.5, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{p.pct}%</span>
            <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{p.hours}h / {p.budget}h</span>
          </div>
          <ProgressBar pct={p.pct} color={p.accent[0]} />
        </div>
        <div data-label="Team" style={{ display: "flex" }}>
          <AvatarStack people={p.team.map((id) => teamById[id]).filter(Boolean).map((m) => ({ name: m.name, bg: m.bg }))} size={24} max={4} />
        </div>
        <div data-label="Due" style={{ fontSize: 11.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{p.deadline}</div>
        <div data-label="Status"><StatusPill label={p.status.label} color={p.status.color} /></div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, position: "relative" }}>
      {/* Hero */}
      <div style={{ margin: "20px 22px 0", borderRadius: 14, padding: "22px 26px", position: "relative", overflow: "hidden", border: "1px solid var(--border-hi)", background: "var(--hero-grad)" }}>
        <GlowOrb x="92%" y="-10%" color="var(--accent-2)" size={360} opacity={0.32} />
        <GlowOrb x="60%" y="-10%" color="var(--info)" size={280} opacity={0.22} />
        <GlowOrb x="-5%" y="120%" color="var(--accent)" size={300} opacity={0.3} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div className="hero-main" style={{ flex: 1, minWidth: 360 }}>
            <Eyebrow color="var(--accent-soft)">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Eyebrow>
            <div style={{ fontSize: 30, color: "var(--text)", fontWeight: 600, letterSpacing: -0.6, marginTop: 8, fontFamily: "'Inter Tight', sans-serif", lineHeight: 1.15 }}>
              {greeting()}, {user.name.split(" ")[0]}
              <span className="italic-serif" style={{ background: "var(--accent-grad-3)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", marginLeft: 12, fontSize: 30, whiteSpace: "nowrap" }}>— let&apos;s ship.</span>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 12.5, color: "var(--text-sub)", flexWrap: "wrap" }}>
              <span><b style={{ color: "var(--text)" }}>{data?.focus.length ?? 0}</b> tasks on your plate</span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span><b style={{ color: "var(--text)" }}>{data?.focusDone ?? 0}</b> done</span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span><b style={{ color: "var(--text)" }}>{k?.myHoursThisWeek ?? 0}h</b> logged this week</span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span><b style={{ color: "var(--success)" }}>↑ 12%</b> vs last</span>
            </div>
          </div>
          <div className="hero-aside" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <button className="btn" style={{ background: "rgba(0,0,0,.3)" }}>
              <Icon d={I.cal} size={13} color="var(--accent-soft)" /> Today&apos;s agenda
            </button>
            <div style={{ fontSize: 11, color: "var(--text-sub)" }}>Next: <b style={{ color: "var(--text)" }}>10:00</b> · Helio standup</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: "18px 22px 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Stat label="Active projects" value={String(k?.activeProjects ?? "—")} sub={`of ${k?.totalProjects ?? 0}`} delta={String(k?.atRisk ?? 0)} deltaUp={false} color="var(--accent)" icon={<Icon d={I.projects} size={12} />} />
        <Stat label="Hours this week" value={String(k?.hoursThisWeekTeam ?? "—")} sub="hrs team" delta="12%" color="var(--info)" icon={<Icon d={I.time} size={12} />} />
        <Stat label="Billable rate" value={`${k?.billableRate ?? "—"}%`} sub="util." delta="3%" color="var(--success)" icon={<Icon d={I.trend} size={12} />} />
        <Stat label="Revenue MTD" value={k ? money(k.revenueMTD, "BDT") : "—"} sub={k ? `open ${money(k.outstanding, "BDT")}` : ""} delta={k ? money(k.billableRevenue, "BDT") : "—"} color="var(--accent-2)" icon={<Icon d={I.dollar} size={12} />} />
      </div>

      {/* Main grid */}
      <div style={{ padding: "14px 22px 0", display: "grid", gridTemplateColumns: "1.55fr 0.85fr", gap: 16 }}>
        <div className="surface" style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: "30%", width: "40%", height: 1, background: "linear-gradient(90deg, transparent, var(--accent), transparent)", opacity: 0.8 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
            <SectionHeader title="Active projects" subtitle="Sorted by health urgency" />
            <button className="btn" onClick={() => router.push("/projects")} style={{ color: "var(--accent-soft)", background: "color-mix(in oklab, var(--accent) 15%, transparent)", borderColor: "var(--border-hi)" }}>View all <Icon d={I.chevR} size={10} /></button>
          </div>
          <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 0.9fr 0.7fr 0.7fr", gap: 14, padding: "7px 18px", borderTop: "1px solid var(--border)" }}>
            {["Project", "Progress", "Team", "Due", "Status"].map((h) => <Eyebrow key={h} size={10}>{h}</Eyebrow>)}
          </div>
          {(data?.activeProjects ?? []).slice(0, 5).map((p) => <ProjRow key={p.id} p={p} />)}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Timer */}
          <div style={{ padding: 1.2, borderRadius: 14, background: "conic-gradient(from 220deg, var(--accent), var(--accent-2), var(--info), var(--accent))" }}>
            <div style={{ background: "var(--bg-deep)", borderRadius: 13, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
              <GlowOrb x="100%" y="0%" color="var(--accent)" size={180} opacity={0.35} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={timer?.running ? "pulse" : ""} style={{ width: 8, height: 8, borderRadius: 99, background: timer?.running ? "var(--success)" : "var(--text-dim)", boxShadow: timer?.running ? "0 0 0 4px color-mix(in oklab, var(--success) 25%, transparent), 0 0 14px var(--success)" : "none" }} />
                  <Eyebrow color="var(--text)" size={11}>{timer ? (timer.running ? `Recording · ${timerProject?.code ?? ""}` : "Paused") : "No timer"}</Eyebrow>
                </div>
                {timer?.billable && <span style={{ fontSize: 10.5, color: "var(--warning)", fontFamily: "'Geist Mono', monospace", padding: "2px 7px", borderRadius: 4, background: "color-mix(in oklab, var(--warning) 14%, transparent)" }}>BILLABLE</span>}
              </div>
              <div style={{ marginTop: 10, position: "relative" }}>
                <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{timer?.note || (timer ? "Untitled session" : "No active timer")}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginTop: 3 }}>{timerProject?.name ?? "Start one on the Time page"} {timer?.task ? `· ${timer.task}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14, position: "relative" }}>
                <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 38, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1, background: timer ? "var(--accent-grad-3)" : "none", WebkitBackgroundClip: timer ? "text" : "border-box", backgroundClip: timer ? "text" : "border-box", color: timer ? "transparent" : "var(--text-dim)" }}>
                  {formatHMS(displayMs)}
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  {timer ? (
                    <>
                      <button onClick={() => (timer.running ? pause() : resume())} title={timer.running ? "Pause" : "Resume"} style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid var(--border)", background: "rgba(0,0,0,.4)", color: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon d={timer.running ? I.pause : I.play} fill={timer.running ? "none" : "currentColor"} stroke={timer.running ? 1.6 : "none"} /></button>
                      <button onClick={() => stop()} title="Stop" style={{ width: 36, height: 36, borderRadius: 9, border: "none", background: "linear-gradient(135deg, var(--accent-2), var(--danger))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 14px color-mix(in oklab, var(--accent-2) 50%, transparent)" }}><Icon d={I.stop} fill="currentColor" stroke="none" /></button>
                    </>
                  ) : (
                    <button onClick={() => router.push("/time")} title="Go to Time" style={{ width: 36, height: 36, borderRadius: 9, border: "none", background: "var(--accent-grad)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon d={I.play} fill="currentColor" stroke="none" /></button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Today's focus */}
          <div className="surface" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>Today&apos;s focus</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 60 }}><ProgressBar pct={data?.focusTotal ? (data.focusDone / data.focusTotal) * 100 : 0} height={5} /></div>
                <span style={{ fontSize: 10.5, color: "var(--accent-soft)", fontFamily: "'Geist Mono', monospace" }}>{data?.focusDone ?? 0}/{data?.focusTotal ?? 0}</span>
              </div>
            </div>
            {(data?.focus ?? []).map((t, i) => {
              const col = PRIORITY_COLOR[t.priority];
              return (
                <div key={t.id} onClick={() => openTask(t.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0", borderTop: i ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid var(--border-hi)", display: "inline-flex", flex: "0 0 auto" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{t.est}h est · {t.due}</div>
                  </div>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: col, boxShadow: `0 0 6px ${col}` }} />
                </div>
              );
            })}
            {data?.focus.length === 0 && <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>Nothing assigned to you — nice and clear.</div>}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div style={{ padding: "14px 22px 28px", display: "grid", gridTemplateColumns: "1.55fr 0.85fr", gap: 16 }}>
        <div className="surface" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
          <GlowOrb x="105%" y="0%" color="var(--info)" size={160} opacity={0.18} />
          <SectionHeader title="Capacity snapshot" subtitle="Team utilization this week" />
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
            {Object.values(teamById).filter((m) => m.util > 0).sort((a, b) => b.util - a.util).slice(0, 6).map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={m.name} bg={m.bg} size={26} />
                <div style={{ width: 110, fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ flex: 1 }}><ProgressBar pct={m.util} color={m.util > 90 ? "var(--warning)" : "var(--accent)"} /></div>
                <span style={{ width: 36, textAlign: "right", fontSize: 11.5, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace" }}>{m.util}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface" style={{ padding: "14px 16px" }}>
          <SectionHeader title="Latest activity" action={<span style={{ fontSize: 11, color: "var(--text-dim)" }}>{activity.length}</span>} />
          <div style={{ marginTop: 10 }}>
            {activity.slice(0, 5).map((a, i) => {
              const member = teamById[a.who];
              if (!member) return null;
              return (
                <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <Avatar name={member.name} bg={member.bg} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-sub)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>{member.name.split(" ")[0]}</span> {a.action} <span style={{ color: "var(--accent-soft)" }}>{a.target}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{a.time}</span><span>·</span>
                      <span style={{ padding: "1px 6px", borderRadius: 4, background: "var(--bg)", border: "1px solid var(--border)", fontFamily: "'Geist Mono', monospace", fontSize: 10 }}>{a.kind}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
