"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Icon,
  I,
  Eyebrow,
  ProgressBar,
  SectionHeader,
  GlowOrb,
  fmtHM,
} from "@/components/primitives";
import { Modal, Field } from "@/components/modal";
import { useApp } from "@/providers/app";
import { useTimer, formatHMS } from "@/providers/timer";
import { api, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { money } from "@/lib/format";
import type { TimeEntry } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TimePage() {
  const { user, projectById, clientById, projects, perms, version, bump } = useApp();
  const { timer, displayMs, start, pause, resume, stop } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [showStart, setShowStart] = useState(false);

  useEffect(() => {
    api.time.list({ mine: true }).then(setEntries).catch(() => {});
  }, [version]);

  const rate = 14500; // display billable rate (BDT/hr)
  const stats = useMemo(() => {
    const totalMins = entries.reduce((a, e) => a + e.mins, 0);
    const billableMins = entries.filter((e) => e.billable).reduce((a, e) => a + e.mins, 0);
    const dayTotals = DAYS.map((d) => entries.filter((e) => e.day === d).reduce((a, e) => a + e.mins, 0));
    const byProject: Record<string, { mins: number; billable: number; entries: number }> = {};
    entries.forEach((e) => {
      const b = (byProject[e.project] ||= { mins: 0, billable: 0, entries: 0 });
      b.mins += e.mins;
      if (e.billable) b.billable += e.mins;
      b.entries += 1;
    });
    return { totalMins, billableMins, dayTotals, byProject };
  }, [entries]);

  const { totalMins, billableMins, dayTotals, byProject } = stats;
  const billablePct = totalMins ? Math.round((billableMins / totalMins) * 100) : 0;
  const timerP = timer ? projectById[timer.project] : undefined;
  const projectIds = Object.keys(byProject);

  const KPI = ({ label, value, sub, accent, icon, delta }: { label: string; value: string; sub: string; accent: string; icon: React.ReactNode; delta?: string }) => (
    <div className="surface" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${accent}, transparent 65%)`, opacity: 0.2, filter: "blur(15px)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ width: 22, height: 22, borderRadius: 5, background: `color-mix(in oklab, ${accent} 22%, transparent)`, color: accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <Eyebrow>{label}</Eyebrow>
        {delta && <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--success)", fontFamily: "'Geist Mono', monospace" }}>↑ {delta}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, position: "relative" }}>
        <span style={{ fontSize: 26, color: "var(--text)", fontWeight: 700, letterSpacing: -0.8, fontFamily: "'Inter Tight', sans-serif" }}>{value}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{sub}</span>
      </div>
    </div>
  );

  // Utilization curve points
  const w = 480, h = 100, max = 10;
  const data = dayTotals.map((m) => m / 60);
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => [i * stepX, h - (v / max) * h] as [number, number]);
  const path = points.reduce((acc, [x, y], i) => acc + (i === 0 ? `M${x} ${y}` : ` L${x} ${y}`), "");

  return (
    <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <div style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, letterSpacing: -0.5, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>
            Time tracking
            <span className="italic-serif" style={{ marginLeft: 12, fontSize: 22, color: "var(--text-sub)", fontWeight: 400 }}>· {fmtHM(totalMins)} this week</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => bump()}><Icon d={I.refresh} size={12} /> Sync</button>
          <button className="btn" onClick={() => exportCsv("timesheet.csv", entries.map((e) => ({ day: e.day, date: e.date, project: projectById[e.project]?.name ?? e.project, task: e.task ?? "", minutes: e.mins, hours: (e.mins / 60).toFixed(2), billable: e.billable ? "yes" : "no", note: e.note })))}><Icon d={I.download} size={12} /> Export</button>
          {perms.canWrite && <button className="btn" onClick={() => setShowLog(true)}><Icon d={I.plus} size={12} /> Log time</button>}
          {perms.canWrite && (timer ? (
            <button className="btn btn-primary" onClick={() => stop()} style={{ background: "linear-gradient(135deg, var(--accent-2), var(--danger))" }}>
              <Icon d={I.stop} size={12} fill="currentColor" stroke="none" /> Stop timer
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowStart(true)}><Icon d={I.play} size={12} fill="currentColor" stroke="none" /> Start timer</button>
          ))}
        </div>
      </div>

      {/* Live timer */}
      <div style={{ padding: 1.4, borderRadius: 14, background: timer ? "conic-gradient(from 220deg, var(--accent), var(--accent-2), var(--info), var(--accent))" : "var(--border)", position: "relative" }}>
        <div className="timer-hero" style={{ background: "var(--bg-deep)", borderRadius: 13, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, position: "relative", overflow: "hidden" }}>
          <GlowOrb x="100%" y="50%" color="var(--accent)" size={240} opacity={timer ? 0.32 : 0.1} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto", position: "relative" }}>
            <span className={timer?.running ? "pulse" : ""} style={{ width: 12, height: 12, borderRadius: 99, background: timer?.running ? "var(--success)" : "var(--text-dim)", boxShadow: timer?.running ? "0 0 0 6px color-mix(in oklab, var(--success) 22%, transparent), 0 0 16px var(--success)" : "none" }} />
            <Eyebrow color={timer?.running ? "var(--success)" : "var(--text-dim)"} size={10}>{timer ? (timer.running ? "LIVE" : "PAUSED") : "IDLE"}</Eyebrow>
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>{timer?.note || (timer ? "Untitled session" : "No active timer")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5, color: "var(--text-sub)" }}>
              {timerP && <span style={{ width: 18, height: 18, borderRadius: 4, background: `linear-gradient(135deg, ${timerP.accent[0]}, ${timerP.accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{timerP.code}</span>}
              {timerP?.name ?? "Start a timer to track work in real time"} {timer?.task ? `· ${timer.task}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, position: "relative" }}>
            <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 42, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1, background: timer ? "var(--accent-grad-3)" : "none", WebkitBackgroundClip: timer ? "text" : "border-box", backgroundClip: timer ? "text" : "border-box", color: timer ? "transparent" : "var(--text-dim)" }}>
              {formatHMS(displayMs)}
            </div>
            {timer?.billable && <Eyebrow color="var(--warning)" size={10}>৳{rate.toLocaleString()}/hr · billable</Eyebrow>}
          </div>
          <div style={{ display: "flex", gap: 8, flex: "0 0 auto", position: "relative" }}>
            {perms.canWrite && (timer ? (
              <>
                <button onClick={() => (timer.running ? pause() : resume())} title={timer.running ? "Pause" : "Resume"} style={{ width: 42, height: 42, borderRadius: 11, border: "1px solid var(--border-hi)", background: "rgba(0,0,0,.35)", color: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon d={timer.running ? I.pause : I.play} size={16} fill={timer.running ? "none" : "currentColor"} stroke={timer.running ? 1.6 : "none"} /></button>
                <button onClick={() => stop()} title="Stop" style={{ width: 42, height: 42, borderRadius: 11, border: "none", background: "linear-gradient(135deg, var(--accent-2), var(--danger))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 16px color-mix(in oklab, var(--accent-2) 50%, transparent)" }}><Icon d={I.stop} size={14} fill="currentColor" stroke="none" /></button>
              </>
            ) : (
              <button onClick={() => setShowStart(true)} title="Start" style={{ width: 42, height: 42, borderRadius: 11, border: "none", background: "var(--accent-grad)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 16px color-mix(in oklab, var(--accent) 50%, transparent)" }}><Icon d={I.play} size={14} fill="currentColor" stroke="none" /></button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KPI label="Logged this week" value={fmtHM(totalMins)} sub="of 40h goal" accent="var(--accent)" icon={<Icon d={I.time} size={12} />} delta="12%" />
        <KPI label="Billable" value={fmtHM(billableMins)} sub={`${billablePct}%`} accent="var(--success)" icon={<Icon d={I.dollar} size={12} />} delta="8%" />
        <KPI label="Revenue · billable" value={money(Math.round((billableMins / 60) * rate), "BDT")} sub={`@ ৳${rate.toLocaleString()}/hr`} accent="var(--accent-2)" icon={<Icon d={I.trend} size={12} />} delta="8%" />
        <KPI label="Avg. day" value={fmtHM(Math.round(totalMins / 5))} sub="Mon–Fri" accent="var(--info)" icon={<Icon d={I.zap} size={12} />} delta="0.4h" />
      </div>

      {/* Timesheet */}
      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <SectionHeader title="Timesheet · this week" subtitle={`May 20 – May 26, 2026 · ${user.name}`} />
        </div>
        <div className="week-scroll">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr) 110px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ padding: "10px 16px" }}><Eyebrow>Project</Eyebrow></div>
          {[["Mon", "20"], ["Tue", "21"], ["Wed", "22"], ["Thu", "23"], ["Fri", "24"], ["Sat", "25"], ["Sun", "26"]].map(([d, n], i) => (
            <div key={d} style={{ padding: "10px 12px", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace", letterSpacing: 0.8, textTransform: "uppercase" }}>{d}</span>
              <span style={{ fontSize: 14, color: i === 6 ? "var(--accent-soft)" : "var(--text)", fontWeight: i === 6 ? 700 : 500, fontFamily: "'Inter Tight', sans-serif", marginTop: 2 }}>{n}</span>
            </div>
          ))}
          <div style={{ padding: "10px 16px", borderLeft: "1px solid var(--border)", textAlign: "right" }}><Eyebrow>Total</Eyebrow></div>
        </div>

        {projectIds.map((pid) => {
          const p = projectById[pid];
          if (!p) return null;
          const b = byProject[pid];
          return (
            <div key={pid} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr) 110px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", flex: "0 0 auto" }}>{p.code}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{clientById[p.client]?.name}</div>
                </div>
              </div>
              {DAYS.map((d) => {
                const cell = entries.filter((e) => e.day === d && e.project === pid);
                const cellMins = cell.reduce((a, e) => a + e.mins, 0);
                const liveCell = cell.some((e) => e.note.includes("Live"));
                return (
                  <div key={d} style={{ padding: "12px 8px", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {cellMins > 0 ? (
                      <>
                        <div style={{ fontSize: 13.5, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{fmtHM(cellMins)}</div>
                        {cell.some((e) => e.billable) && <Eyebrow color="var(--success)" size={9}>billable</Eyebrow>}
                        {liveCell && <span className="pulse" style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: 99, background: "var(--success)", boxShadow: "0 0 6px var(--success)" }} />}
                      </>
                    ) : (
                      <span style={{ color: "var(--text-soft)", fontSize: 16, fontFamily: "'Geist Mono', monospace" }}>·</span>
                    )}
                  </div>
                );
              })}
              <div style={{ padding: "12px 16px", borderLeft: "1px solid var(--border)", textAlign: "right" }}>
                <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{fmtHM(b.mins)}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{money(Math.round((b.billable / 60) * rate), "BDT", false)}</div>
              </div>
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(7, 1fr) 110px", background: "var(--surface)" }}>
          <div style={{ padding: "12px 16px" }}><Eyebrow color="var(--text)">Daily total</Eyebrow></div>
          {DAYS.map((d, i) => (
            <div key={d} style={{ padding: "12px 8px", borderLeft: "1px solid var(--border)", textAlign: "center" }}>
              <span style={{ fontSize: 13.5, color: i === 6 ? "var(--accent-soft)" : "var(--text)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 600 }}>{fmtHM(dayTotals[i])}</span>
            </div>
          ))}
          <div style={{ padding: "12px 16px", borderLeft: "1px solid var(--border)", textAlign: "right" }}>
            <span style={{ fontSize: 16, color: "var(--accent-soft)", fontFamily: "'Inter Tight', sans-serif", fontWeight: 700 }}>{fmtHM(totalMins)}</span>
          </div>
        </div>
        </div>
      </div>

      {/* Util + breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="Daily utilization" subtitle="Hours per day · ideal 7h target" />
          <div style={{ position: "relative", marginTop: 14, height: 120 }}>
            <svg width="100%" height={h + 18} viewBox={`0 0 ${w} ${h + 18}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="util-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1={h - (7 / max) * h} x2={w} y2={h - (7 / max) * h} stroke="var(--border-hi)" strokeDasharray="3,4" strokeWidth="1" />
              <path d={`${path} L${w} ${h} L0 ${h} Z`} fill="url(#util-fill)" />
              <path d={path} stroke="var(--accent)" strokeWidth="2" fill="none" style={{ filter: "drop-shadow(0 0 6px var(--accent))" }} />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3.5} fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
              ))}
              {DAYS.map((d, i) => (
                <text key={d} x={i * stepX} y={h + 14} fill={i === 6 ? "var(--accent-soft)" : "var(--text-dim)"} fontSize="10" fontFamily="Geist Mono" textAnchor="middle">{d}</text>
              ))}
            </svg>
          </div>
        </div>

        <div className="surface" style={{ padding: "16px 18px" }}>
          <SectionHeader title="By project" subtitle="Hours this week" />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {projectIds.map((pid) => {
              const p = projectById[pid];
              if (!p) return null;
              const pct = totalMins ? Math.round((byProject[pid].mins / totalMins) * 100) : 0;
              return (
                <div key={pid}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, flex: "0 0 auto" }} />
                      <span style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split("·")[0].trim()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginLeft: 8 }}>
                      <span style={{ fontSize: 12.5, color: "var(--text)", fontFamily: "'Geist Mono', monospace", fontWeight: 600 }}>{fmtHM(byProject[pid].mins)}</span>
                      <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={p.accent[0]} height={5} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent entries */}
      <div className="surface" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionHeader title="Entries" subtitle="Latest first" />
          {perms.canWrite && <button className="btn btn-primary" onClick={() => setShowLog(true)}><Icon d={I.plus} size={12} /> Manual entry</button>}
        </div>
        <div className="rt-head" style={{ display: "grid", gridTemplateColumns: "70px 1fr 90px 110px 90px 32px", gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--border)" }}>
          {["Day", "Description", "Task", "Project", "Time", ""].map((hd) => <Eyebrow key={hd} size={10}>{hd}</Eyebrow>)}
        </div>
        {[...entries].reverse().slice(0, 12).map((e, i) => {
          const p = projectById[e.project];
          const billClass = e.billable ? "var(--success)" : "var(--text-dim)";
          return (
            <div key={e.id} className="rt-row" style={{ display: "grid", gridTemplateColumns: "70px 1fr 90px 110px 90px 32px", gap: 12, padding: "11px 18px", borderTop: i ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <div data-label="Day">
                <Eyebrow size={10}>{e.day}</Eyebrow>
                <div style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "'Geist Mono', monospace", marginTop: 1 }}>{e.date.split(" ").pop()}</div>
              </div>
              <div data-label="Description" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.note || "—"}</div>
                <div style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: billClass, fontFamily: "'Geist Mono', monospace", padding: "1px 6px", borderRadius: 3, background: `color-mix(in oklab, ${billClass} 14%, transparent)`, fontWeight: 600 }}>{e.billable ? "BILLABLE" : "INTERNAL"}</span>
                </div>
              </div>
              <span data-label="Task" style={{ fontSize: 11.5, color: "var(--accent-soft)", fontFamily: "'Geist Mono', monospace" }}>{e.task || "—"}</span>
              <div data-label="Project" style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                {p && <span style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, ${p.accent[0]}, ${p.accent[1]})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>{p.code}</span>}
                <span style={{ fontSize: 11.5, color: "var(--text-sub)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p?.name.split("·")[0].trim()}</span>
              </div>
              <div data-label="Time">
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, fontFamily: "'Inter Tight', sans-serif" }}>{fmtHM(e.mins)}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>{e.billable ? money(Math.round((e.mins / 60) * rate), "BDT", false) : "—"}</div>
              </div>
              {perms.canWrite ? (
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} title="Delete entry" onClick={async () => { await api.time.remove(e.id).catch(() => {}); bump(); }}>
                  <Icon d={I.trash} size={12} />
                </button>
              ) : <span />}
            </div>
          );
        })}
        {entries.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No time logged yet. Hit “Log time”.</div>}
      </div>

      {showLog && (
        <LogTimeModal projects={projects} onClose={() => setShowLog(false)} onLogged={() => { bump(); setShowLog(false); }} />
      )}
      {showStart && (
        <StartTimerModal
          projects={projects}
          onClose={() => setShowStart(false)}
          onStart={async (body) => { await start(body); setShowStart(false); }}
        />
      )}
    </div>
  );
}

function StartTimerModal({
  projects,
  onClose,
  onStart,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onStart: (body: { project: string; note?: string; billable?: boolean }) => Promise<void>;
}) {
  const [project, setProject] = useState(projects[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [billable, setBillable] = useState(true);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      await onStart({ project, note, billable });
    } catch {
      setBusy(false);
    }
  };

  return (
    <Modal title="Start timer" subtitle="Track work live — stop it to log the time." onClose={onClose}>
      <Field label="Project">
        <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="What are you working on?">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rate-limit middleware" autoFocus />
      </Field>
      <Field label="Billable">
        <select className="input" value={billable ? "yes" : "no"} onChange={(e) => setBillable(e.target.value === "yes")}>
          <option value="yes">Billable</option>
          <option value="no">Internal</option>
        </select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={go} disabled={busy || !project}>
          <Icon d={I.play} size={12} fill="currentColor" stroke="none" /> {busy ? "Starting…" : "Start timer"}
        </button>
      </div>
    </Modal>
  );
}

function LogTimeModal({
  projects,
  onClose,
  onLogged,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onLogged: () => void;
}) {
  const [project, setProject] = useState(projects[0]?.id ?? "");
  const [hours, setHours] = useState(1);
  const [billable, setBillable] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api.time.log({ project, mins: Math.round(hours * 60), billable, note });
      onLogged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not log time");
      setBusy(false);
    }
  };

  return (
    <Modal title="Log time" subtitle="Add a manual time entry to this week." onClose={onClose}>
      <Field label="Project">
        <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hours">
          <input className="input" type="number" step="0.25" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </Field>
        <Field label="Billable">
          <select className="input" value={billable ? "yes" : "no"} onChange={(e) => setBillable(e.target.value === "yes")}>
            <option value="yes">Billable</option>
            <option value="no">Internal</option>
          </select>
        </Field>
      </div>
      <Field label="Note">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" />
      </Field>
      {err && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !project || hours <= 0}>{busy ? "Logging…" : "Log entry"}</button>
      </div>
    </Modal>
  );
}
