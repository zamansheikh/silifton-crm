"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, I } from "./primitives";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = 460,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  // Only dismiss when the press *starts* on the backdrop. Otherwise a drag that
  // begins inside the card (e.g. selecting text) and releases on the backdrop
  // would fire a click on the backdrop and wrongly close the modal.
  const downOnBackdrop = useRef(false);

  if (typeof document === "undefined") return null;

  // Portal to <body> so the overlay escapes the app shell's stacking context
  // (otherwise the top bar / screen-scroll layers render on top of it).
  return createPortal(
    // Flex-centered overlay. Centering lives on this wrapper (not a transform),
    // so the inner card's fade-up animation can't knock it off-center.
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
        downOnBackdrop.current = false;
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
        animation: "scrim-in .2s ease-out",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-frosted fade-up modal-card"
        style={{
          width,
          maxWidth: "92vw",
          maxHeight: "90vh",
          overflow: "auto",
          zIndex: 61,
          boxShadow: "0 30px 80px rgba(0,0,0,.5)",
          background: "var(--bg-elevate)",
          margin: "auto",
        }}
      >
        <div style={{ height: 3, background: "var(--accent-grad)" }} />
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", letterSpacing: -0.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} className="btn btn-icon"><Icon d={I.x} size={14} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
