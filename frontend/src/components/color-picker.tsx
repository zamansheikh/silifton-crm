"use client";

import { Icon, I } from "@/components/primitives";

const SWATCHES = [
  "#a855f7", "#06b6d4", "#ec4899", "#10b981", "#f59e0b", "#ef4444",
  "#6366f1", "#14b8a6", "#f97316", "#84cc16", "#22d3ee", "#9333ea",
];

const GRADIENTS: [string, string][] = [
  ["#a855f7", "#f472b6"],
  ["#06b6d4", "#14b8a6"],
  ["#ec4899", "#f472b6"],
  ["#10b981", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#6366f1", "#06b6d4"],
  ["#9333ea", "#ec4899"],
  ["#f97316", "#ec4899"],
];

// Single-color swatch picker (e.g. client card color).
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: c,
            border: value.toLowerCase() === c.toLowerCase() ? "2px solid var(--text)" : "1px solid var(--border)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {value.toLowerCase() === c.toLowerCase() && <Icon d={I.check} size={13} color="#fff" />}
        </button>
      ))}
    </div>
  );
}

// Gradient-pair picker (e.g. project accent). value is [from, to].
export function GradientPicker({ value, onChange }: { value: [string, string]; onChange: (pair: [string, string]) => void }) {
  const eq = (a: [string, string]) => a[0].toLowerCase() === value[0]?.toLowerCase() && a[1].toLowerCase() === value[1]?.toLowerCase();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {GRADIENTS.map((g) => (
        <button
          key={g.join("-")}
          type="button"
          onClick={() => onChange(g)}
          title={g.join(" → ")}
          style={{
            width: 40,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
            border: eq(g) ? "2px solid var(--text)" : "1px solid var(--border)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {eq(g) && <Icon d={I.check} size={13} color="#fff" />}
        </button>
      ))}
    </div>
  );
}
