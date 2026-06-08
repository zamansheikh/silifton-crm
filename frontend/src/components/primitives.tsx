"use client";

import type { CSSProperties, ReactNode } from "react";

// ── Icon ────────────────────────────────────────────────────────────
export const Icon = ({
  d,
  size = 14,
  stroke = 1.6,
  fill = "none",
  color,
  style,
}: {
  d: string | string[];
  size?: number;
  stroke?: number | string;
  fill?: string;
  color?: string;
  style?: CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color || "currentColor"}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const I = {
  dashboard: "M3 12l9-9 9 9M5 10v10h14V10",
  projects: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  tasks: "M9 11l3 3 8-8M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  time: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  clients: "M17 21v-2a4 4 0 00-3-3.87M9 21v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0z",
  team: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21a9 9 0 0118 0",
  invoices: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5",
  reports: "M3 3v18h18M7 14l4-4 4 4 5-5",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.16.36.27.74.33 1.11H21a2 2 0 110 4h-.09c-.06.37-.17.75-.33 1.11z",
  search: "M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  plus: "M12 5v14M5 12h14",
  chevR: "M9 18l6-6-6-6",
  chevL: "M15 18l-6-6 6-6",
  chevD: "M6 9l6 6 6-6",
  chevU: "M6 15l6-6 6 6",
  check: "M5 13l4 4L19 7",
  x: "M18 6L6 18M6 6l12 12",
  play: "M5 4l14 8-14 8V4z",
  pause: "M6 6h4v12H6zM14 6h4v12h-4z",
  stop: "M6 6h12v12H6z",
  filter: "M3 6h18M6 12h12M10 18h4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  arrow: "M5 12h14M13 5l7 7-7 7",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  paperclip:
    "M21.4 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  flag: "M4 22V4M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1",
  msg: "M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z",
  cal: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  kanban: "M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M19 3h-4M15 21h4a2 2 0 002-2V5a2 2 0 00-2-2",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z",
  trend: "M22 7l-9.5 9.5-5-5L1 18",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 110 8 4 4 0 010-8z",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 13h.01M9 17h.01M14 13h.01M14 17h.01",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6",
  phone:
    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  dollar: "M12 2v20M5 9h11a3 3 0 010 6H8a3 3 0 000 6h11",
  globe: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c2.5 3 4 7 4 10s-1.5 7-4 10c-2.5-3-4-7-4-10s1.5-7 4-10z",
  rocket:
    "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  copy: "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0020.5 15",
  archive: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  lock: "M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zM7 11V7a5 5 0 0110 0v4",
  sparkles:
    "M12 3L13.5 8L18 9.5L13.5 11L12 16L10.5 11L6 9.5L10.5 8L12 3zM19 14l.94 2.06L22 17l-2.06.94L19 20l-.94-2.06L16 17l2.06-.94L19 14zM5 14l.94 2.06L8 17l-2.06.94L5 20l-.94-2.06L2 17l2.06-.94L5 14z",
} as const;

// ── Avatar ──────────────────────────────────────────────────────────
export const Avatar = ({
  name,
  bg,
  size = 24,
  ring,
  style,
}: {
  name?: string;
  bg?: string;
  size?: number;
  ring?: string | number;
  style?: CSSProperties;
}) => {
  const initials =
    name
      ?.split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "??";
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: bg || "var(--accent-grad)",
        boxShadow: ring
          ? `0 0 0 2px var(--ring-bg), 0 0 0 ${2 + (typeof ring === "number" ? ring : 1.5)}px ${
              typeof ring === "string" ? ring : "var(--accent)"
            }`
          : "none",
        ...style,
      }}
    >
      {initials}
    </span>
  );
};

export const AvatarStack = ({
  people,
  size = 22,
  max = 5,
}: {
  people: { name: string; bg?: string }[];
  size?: number;
  max?: number;
}) => (
  <span className="avatar-stack" style={{ display: "inline-flex" }}>
    {people.slice(0, max).map((p, i) => (
      <Avatar key={i} name={p.name} bg={p.bg} size={size} ring="var(--ring-bg)" />
    ))}
    {people.length > max && (
      <span
        className="avatar"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.38,
          background: "var(--surface-hi)",
          color: "var(--text-sub)",
          border: "1px solid var(--border)",
        }}
      >
        +{people.length - max}
      </span>
    )}
  </span>
);

// ── Status pill ─────────────────────────────────────────────────────
export const StatusPill = ({
  label,
  color = "var(--success)",
  dot = true,
  size = "sm",
}: {
  label: string;
  color?: string;
  dot?: boolean;
  size?: "sm" | "md";
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: size === "sm" ? 11 : 12,
      fontWeight: 600,
      padding: size === "sm" ? "3px 9px" : "5px 11px",
      borderRadius: 99,
      background: `color-mix(in oklab, ${color} 16%, transparent)`,
      color,
      border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      whiteSpace: "nowrap",
    }}
  >
    {dot && (
      <span className="chip-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    )}
    {label}
  </span>
);

// ── Progress bar ────────────────────────────────────────────────────
export const ProgressBar = ({
  pct,
  color,
  height = 5,
  glow = true,
}: {
  pct: number;
  color?: string;
  height?: number;
  glow?: boolean;
}) => {
  const c1 = color || "var(--accent)";
  const c2 = color || "var(--accent-2)";
  return (
    <div
      style={{
        height,
        borderRadius: 99,
        background: "color-mix(in oklab, var(--text) 6%, transparent)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${c1}, ${c2})`,
          boxShadow: glow ? `0 0 10px color-mix(in oklab, ${c1} 50%, transparent)` : "none",
          transition: "width .4s cubic-bezier(.2,.7,.3,1)",
        }}
      />
    </div>
  );
};

export const Eyebrow = ({
  children,
  color,
  size = 10.5,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
}) => (
  <span
    className="mono"
    style={{
      fontSize: size,
      color: color || "var(--text-dim)",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </span>
);

export const Card = ({
  children,
  frosted,
  style,
  ...rest
}: {
  children: ReactNode;
  frosted?: boolean;
  style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={frosted ? "surface-frosted" : "surface"} style={style} {...rest}>
    {children}
  </div>
);

export const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
    <div>
      <div
        style={{
          fontSize: 14,
          color: "var(--text)",
          fontWeight: 600,
          fontFamily: "'Inter Tight', sans-serif",
          letterSpacing: -0.2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
    {action}
  </div>
);

export const GridBg = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage:
        "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
      maskImage: "radial-gradient(ellipse at 30% 0%, rgba(0,0,0,1), rgba(0,0,0,0) 80%)",
      WebkitMaskImage: "radial-gradient(ellipse at 30% 0%, rgba(0,0,0,1), rgba(0,0,0,0) 80%)",
    }}
  />
);

export const GlowOrb = ({
  x = "50%",
  y = "50%",
  color = "var(--accent)",
  size = 300,
  opacity = 0.25,
}: {
  x?: string;
  y?: string;
  color?: string;
  size?: number;
  opacity?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      transform: "translate(-50%, -50%)",
      background: `radial-gradient(circle, ${color}, transparent 60%)`,
      opacity,
      filter: "blur(30px)",
      pointerEvents: "none",
    }}
  />
);

// ── Shared helpers ──────────────────────────────────────────────────
export const PRIORITY_COLOR: Record<string, string> = {
  Critical: "var(--danger)",
  High: "var(--warning)",
  Medium: "var(--accent)",
  Low: "var(--text-dim)",
};

export const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  backlog: { label: "Backlog", color: "var(--text-dim)", icon: I.archive },
  todo: { label: "To do", color: "var(--info)", icon: I.list },
  doing: { label: "In progress", color: "var(--accent)", icon: I.zap },
  review: { label: "In review", color: "var(--warning)", icon: I.flag },
  done: { label: "Done", color: "var(--success)", icon: I.check },
};

export const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `$${n.toLocaleString()}`;
};
export const fmtHM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
};
