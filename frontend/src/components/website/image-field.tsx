"use client";

import { useRef, useState } from "react";
import { Icon, I } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { readFileAsDataUrl } from "@/lib/format";
import { labelStyle } from "./ui";

// Image picker that uploads straight to Cloudinary through the API and hands
// back the hosted URL (plus public id so the file can be removed later).
export function ImageField({
  label,
  value,
  onChange,
  aspect = "16/10",
  help,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (url: string, publicId?: string) => void;
  aspect?: string;
  help?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file || disabled) return;
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const up = await api.website.uploads.upload({ name: file.name, dataUrl });
      onChange(up.url, up.publicId);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files?.[0]); }}
        style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 10, border: "1px dashed var(--border-hi)", borderRadius: 10, background: "var(--surface)" }}
      >
        <div
          aria-hidden
          style={{ width: 110, aspectRatio: aspect, borderRadius: 8, flexShrink: 0, background: value ? `url(${value}) center/cover` : "var(--surface-hi)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-dim)" }}
        >
          {!value && <Icon d={I.upload} size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={busy || disabled} onClick={() => input.current?.click()}>
              <Icon d={I.upload} size={12} /> {busy ? "Uploading…" : value ? "Replace" : "Choose image"}
            </button>
            {value && !busy && !disabled && (
              <button type="button" className="btn btn-ghost" onClick={() => onChange("")}>
                <Icon d={I.trash} size={12} /> Remove
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>{help ?? "Drag & drop or click. PNG / JPG / WebP, up to 10 MB."}</div>
          {value && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, wordBreak: "break-all" }}>{value}</div>}
          {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{err}</div>}
        </div>
        <input ref={input} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
