"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, I, SectionHeader } from "@/components/primitives";
import { useApp } from "@/providers/app";
import { api, ApiError } from "@/lib/api";
import type { WebSettings } from "@/lib/types";
import { FieldsForm, fromForm, toForm, type FieldDef, type FormState } from "@/components/website/fields";
import { Banner, Loading, PageHeader, SITE_URL, Tabs, pageStyle } from "@/components/website/ui";

type TabKey = "site.hero" | "site.about" | "site.footer" | "site.social" | "site.seo" | "workspace.general";

const TABS: Array<{ key: TabKey; label: string; title: string; blurb: string; preview: string; fields: FieldDef[] }> = [
  {
    key: "site.hero",
    label: "Hero",
    title: "Home page hero",
    blurb: "The first thing visitors read.",
    preview: "/",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "headline", label: "Headline", type: "textarea", rows: 2, required: true },
      { key: "sub", label: "Subheading", type: "textarea", rows: 2 },
      { key: "primaryCta", label: "Primary button label", type: "text", half: true },
      { key: "primaryCtaHref", label: "Primary button link", type: "text", half: true, mono: true },
      { key: "secondaryCta", label: "Secondary button label", type: "text", half: true },
      { key: "secondaryCtaHref", label: "Secondary button link", type: "text", half: true, mono: true },
      { key: "showStats", label: "Show statistics row", type: "toggle", help: "Four key numbers under the hero." },
      { key: "showMarquee", label: "Show client marquee", type: "toggle", help: "Scrolling client logos." },
      { key: "background", label: "Background image", type: "image", publicIdKey: "backgroundPublicId", help: "Optional. Falls back to the default gradient." },
    ],
  },
  {
    key: "site.about",
    label: "About",
    title: "About page",
    blurb: "Headline and intro paragraph.",
    preview: "/about",
    fields: [
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "intro", label: "Intro paragraph", type: "textarea", rows: 5 },
    ],
  },
  {
    key: "site.footer",
    label: "Footer",
    title: "Footer",
    blurb: "Shown on every page.",
    preview: "/",
    fields: [
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "address", label: "Address", type: "text" },
      { key: "email", label: "Contact email", type: "text", mono: true },
      { key: "copyright", label: "Copyright line", type: "text" },
    ],
  },
  {
    key: "site.social",
    label: "Social",
    title: "Social links",
    blurb: "Leave a field blank to hide that icon.",
    preview: "/",
    fields: [
      { key: "twitter", label: "Twitter / X", type: "text", half: true, mono: true, placeholder: "https://x.com/…" },
      { key: "linkedin", label: "LinkedIn", type: "text", half: true, mono: true, placeholder: "https://linkedin.com/company/…" },
      { key: "github", label: "GitHub", type: "text", half: true, mono: true, placeholder: "https://github.com/…" },
      { key: "youtube", label: "YouTube", type: "text", half: true, mono: true, placeholder: "https://youtube.com/@…" },
    ],
  },
  {
    key: "site.seo",
    label: "SEO",
    title: "SEO defaults",
    blurb: "Used by pages without their own metadata.",
    preview: "/",
    fields: [
      { key: "title", label: "Site title", type: "text" },
      { key: "description", label: "Description", type: "textarea", rows: 2, maxLength: 200, help: "Aim for 160 characters." },
      { key: "keywords", label: "Keywords", type: "text", help: "Comma-separated." },
      { key: "ogImage", label: "Default share image", type: "image", publicIdKey: "ogImagePublicId", help: "1200×630 recommended." },
    ],
  },
  {
    key: "workspace.general",
    label: "General",
    title: "General",
    blurb: "Workspace identity and public-site status.",
    preview: "/",
    fields: [
      { key: "workspaceName", label: "Workspace name", type: "text", half: true },
      { key: "timezone", label: "Default timezone", type: "select", half: true, options: ["GMT+6 — Dhaka", "GMT+0 — London", "GMT+1 — Lagos", "GMT-5 — New York"] },
      { key: "publicDomain", label: "Public domain", type: "text", half: true, mono: true },
      { key: "adminDomain", label: "Admin domain", type: "text", half: true, mono: true },
      { key: "siteOnline", label: "Public site online", type: "toggle", help: "Off shows the maintenance notice on the public site." },
    ],
  },
];

export default function WebsiteSettingsPage() {
  const { perms } = useApp();
  const canEdit = perms.projects;
  const [tab, setTab] = useState<TabKey>("site.hero");
  const [all, setAll] = useState<WebSettings | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = TABS.find((t) => t.key === tab)!;

  const load = useCallback(async () => {
    try {
      const data = await api.website.settings.list();
      setAll(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load settings");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-seed the form whenever the tab or the loaded data changes.
  useEffect(() => {
    if (!all) return;
    setForm(toForm(all[tab] ?? {}, def.fields));
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, tab]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      // Preserve keys the form doesn't manage (e.g. public ids) by merging.
      const payload = { ...(all?.[tab] ?? {}), ...fromForm(form, def.fields) };
      const next = await api.website.settings.set(tab, payload);
      setAll((prev) => ({ ...(prev ?? {}), [tab]: next }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const hero = tab === "site.hero" ? form : null;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Site settings"
        meta="copy, links & SEO"
        actions={
          <a className="btn" href={`${SITE_URL}${def.preview}`} target="_blank" rel="noreferrer">
            <Icon d={I.eye} size={12} /> Preview on site
          </a>
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => [t.key, t.label] as [TabKey, string])} />
      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      {!all ? (
        <Loading label="Loading settings…" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: hero ? "minmax(0, 1.2fr) minmax(0, 1fr)" : "minmax(0, 760px)", gap: 16, alignItems: "start" }}>
          <div className="surface" style={{ padding: "16px 18px" }}>
            <SectionHeader title={def.title} subtitle={def.blurb} />
            <div style={{ marginTop: 14 }}>
              <FieldsForm fields={def.fields} form={form} setForm={setForm} disabled={busy || !canEdit} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              {canEdit && (
                <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              )}
              {saved && <span style={{ fontSize: 12, color: "var(--success)" }}>✓ Saved — live on the next page load.</span>}
              {!canEdit && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Read-only for your role.</span>}
            </div>
          </div>

          {hero && (
            <div className="surface" style={{ padding: "16px 18px", position: "sticky", top: 0 }}>
              <SectionHeader title="Live preview" subtitle="Approximate rendering of the hero" />
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 10,
                  padding: 24,
                  minHeight: 240,
                  border: "1px solid var(--border)",
                  background: typeof hero.background === "string" && hero.background ? `url(${hero.background}) center/cover` : "linear-gradient(135deg, #0B1020, #1a1f3a)",
                  color: "#fff",
                  textShadow: "0 2px 12px rgba(0,0,0,.5)",
                }}
              >
                <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8 }}>{String(hero.eyebrow ?? "")}</div>
                <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 12, fontFamily: "'Inter Tight', sans-serif" }}>{String(hero.headline ?? "")}</div>
                <div style={{ fontSize: 13, marginTop: 12, lineHeight: 1.5, opacity: 0.85 }}>{String(hero.sub ?? "")}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <span className="btn btn-primary" style={{ pointerEvents: "none" }}>{String(hero.primaryCta ?? "")}</span>
                  <span className="btn" style={{ pointerEvents: "none", color: "#fff" }}>{String(hero.secondaryCta ?? "")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
