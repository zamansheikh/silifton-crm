"use client";

// Lightweight SVG charts for the Website overview (no charting dependency).

export function Sparkline({ values, color = "var(--accent)", height = 36, width = 200 }: { values: number[]; color?: string; height?: number; width?: number }) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const n = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i / n) * width},${height - ((v - min) / range) * (height - 6) - 3}`);
  const area = `M0,${height} L${pts.join(" L")} L${width},${height} Z`;
  const gradId = `spk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Series = { values: number[]; color: string };

export function AreaChart({ series, height = 260, labels }: { series: Series[]; height?: number; labels?: string[] }) {
  const w = 800;
  const h = height;
  const pad = { t: 20, r: 20, b: 32, l: 40 };
  const allVals = series.flatMap((s) => s.values);
  const max = (Math.max(0, ...allVals) || 1) * 1.15;
  const count = series[0]?.values.length ?? 0;
  const xStep = count > 1 ? (w - pad.l - pad.r) / (count - 1) : 0;
  const yToPx = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  const xToPx = (i: number) => pad.l + i * xStep;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((p) => pad.t + (h - pad.t - pad.b) * p);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ac-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {grid.map((y, i) => (
        <line key={i} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      {labels?.map((lab, i) => (
        <text key={i} x={xToPx(i)} y={h - 10} fill="var(--text-dim)" fontSize="10" fontFamily="'Geist Mono', monospace" textAnchor="middle">
          {lab}
        </text>
      ))}
      {series.map((s, si) => {
        if (!s.values.length) return null;
        const pts = s.values.map((v, i) => `${xToPx(i)},${yToPx(v)}`).join(" L ");
        const area = `M ${pad.l},${h - pad.b} L ${pts} L ${xToPx(s.values.length - 1)},${h - pad.b} Z`;
        return (
          <g key={si}>
            <path d={area} fill={`url(#ac-${si})`} />
            <path d={`M ${pts}`} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ data, size = 160 }: { data: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 12;
  const c = size / 2;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {data.map((d, i) => {
        if (d.value <= 0) return null;
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += d.value;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = c + r * Math.cos(start);
        const y1 = c + r * Math.sin(start);
        const x2 = c + r * Math.cos(end);
        const y2 = c + r * Math.sin(end);
        return <path key={i} d={`M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={d.color} opacity="0.9" />;
      })}
      <circle cx={c} cy={c} r={r * 0.62} fill="var(--bg-elevate)" />
    </svg>
  );
}
