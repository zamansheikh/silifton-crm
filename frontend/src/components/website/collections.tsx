"use client";

import type { ReactNode } from "react";
import type { ContentCollection, WebItem } from "@/lib/types";
import type { FieldDef } from "./fields";
import { Chip, STATUS_COLOR } from "./ui";

// One config per public-site collection: what the form asks for, what the list
// shows, and how new ids are minted. The editor component is generic.

export interface ColumnDef {
  key: string;
  label: string;
  width: string;
  render?: (item: WebItem) => ReactNode;
}

export interface CollectionDef {
  key: ContentCollection;
  label: string;
  singular: string;
  blurb: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  searchKeys: string[];
  defaults: Record<string, unknown>;
  /** Suggest an id for a new record from the form (falls back to the API's own). */
  newId?: (form: Record<string, unknown>, items: WebItem[]) => string | undefined;
  /** Which stored key is the identity used in update/delete URLs. */
  idOf: (item: WebItem) => string;
  sort?: (a: WebItem, b: WebItem) => number;
  /** Public page for "view on site". */
  previewPath?: (item: WebItem) => string | null;
  /** Last-minute normalisation before the payload is sent. */
  normalize?: (payload: Record<string, unknown>, isNew: boolean) => Record<string, unknown>;
  /** Extra payload only on create (e.g. counters). */
  createExtras?: Record<string, unknown>;
}

const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();

const Thumb = ({ image, letter, color, round }: { image?: string; letter: string; color?: string; round?: boolean }) => (
  <span
    aria-hidden
    style={{
      width: 36,
      height: 36,
      borderRadius: round ? "50%" : 8,
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Inter Tight', sans-serif",
      color: color ?? "var(--accent-soft)",
      background: image ? `url(${image}) center/cover` : `color-mix(in oklab, ${color ?? "var(--accent)"} 18%, var(--surface-hi))`,
      border: "1px solid var(--border)",
    }}
  >
    {!image && letter}
  </span>
);

const TitleCell = ({ title, sub, thumb }: { title: ReactNode; sub?: ReactNode; thumb?: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
    {thumb}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  </div>
);

const Status = ({ value }: { value: string }) => <Chip label={value} color={STATUS_COLOR[value] ?? "var(--text-dim)"} />;

const SERVICE_ICONS = ["cpu", "cloud", "bolt", "phone", "brush", "users", "code", "server", "globe", "shield", "chart", "layers"] as const;
const INDUSTRIES = ["EdTech", "Mobile", "Developer tools", "Internal tools", "Media", "AI", "Fintech", "Healthtech", "Supply chain", "Energy", "Retail", "Open source"] as const;
const POST_CATEGORIES = ["Engineering", "Design", "Culture", "Operations", "AI"] as const;
const TEAMS = ["Engineering", "Platform", "Product", "AI", "Design", "Mobile", "Marketing", "Operations"] as const;
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
const LEVELS = ["Junior", "Mid", "Senior", "Staff", "Lead", "Manager", "Director"] as const;

export const COLLECTIONS: CollectionDef[] = [
  {
    key: "services",
    label: "Services",
    singular: "service",
    blurb: "Capabilities listed on the services page and home.",
    fields: [
      { key: "num", label: "Order", type: "text", half: true, required: true, placeholder: "01", maxLength: 4, mono: true, help: "Also the item's id — keep it unique." },
      { key: "icon", label: "Icon", type: "select", half: true, options: SERVICE_ICONS },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "desc", label: "Description", type: "textarea", required: true, rows: 3 },
      { key: "tags", label: "Tags", type: "tags", placeholder: "React, Next.js, Node", help: "Comma-separated." },
    ],
    columns: [
      { key: "num", label: "Order", width: "60px", render: (it) => <span className="mono" style={{ fontSize: 12, color: "var(--accent-soft)" }}>{s(it.num)}</span> },
      { key: "title", label: "Service", width: "1fr", render: (it) => <TitleCell title={s(it.title)} sub={s(it.desc)} /> },
      { key: "tags", label: "Tags", width: "220px", render: (it) => <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(Array.isArray(it.tags) ? (it.tags as string[]) : []).slice(0, 3).map((t) => <Chip key={t} label={t} />)}</span> },
    ],
    searchKeys: ["title", "desc", "tags"],
    defaults: { icon: "cpu" },
    newId: (form) => s(form.num).trim() || undefined,
    idOf: (it) => s(it.id) || s(it.num),
    sort: (a, b) => s(a.num).localeCompare(s(b.num)),
    previewPath: () => "/services",
  },
  {
    key: "portfolio",
    label: "Portfolio",
    singular: "case study",
    blurb: "Case studies shown on the portfolio page and home teaser.",
    fields: [
      { key: "client", label: "Client", type: "text", half: true, required: true },
      { key: "industry", label: "Industry", type: "select", half: true, options: INDUSTRIES },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "metric", label: "Headline metric", type: "text", half: true, required: true, placeholder: "$1.2B daily volume" },
      { key: "year", label: "Year", type: "number", half: true },
      { key: "status", label: "Status", type: "select", half: true, options: ["Live", "In progress", "Closed"] },
      { key: "span", label: "Grid span", type: "select", half: true, options: [{ value: 4, label: "4 · small (⅓ row)" }, { value: 6, label: "6 · half" }, { value: 8, label: "8 · large (⅔ row)" }, { value: 12, label: "12 · full row" }] },
      { key: "thumb", label: "Fallback letter", type: "text", half: true, maxLength: 1, help: "Shown when there is no cover image." },
      { key: "color", label: "Accent colour", type: "color", half: true },
      { key: "summary", label: "Summary", type: "textarea", rows: 3, help: "1–2 sentences shown on the card." },
      { key: "body", label: "Case study body", type: "textarea", rows: 10, mono: true, help: "Blank line between paragraphs." },
      { key: "image", label: "Cover image", type: "image", publicIdKey: "imagePublicId" },
    ],
    columns: [
      { key: "title", label: "Case study", width: "1fr", render: (it) => <TitleCell thumb={<Thumb image={s(it.image) || undefined} letter={s(it.thumb) || s(it.client).charAt(0)} color={s(it.color) || undefined} />} title={s(it.title)} sub={`${s(it.client)} · ${s(it.industry)}`} /> },
      { key: "metric", label: "Metric", width: "160px", render: (it) => <Chip label={s(it.metric)} color="var(--accent)" /> },
      { key: "status", label: "Status", width: "110px", render: (it) => <Status value={s(it.status)} /> },
      { key: "year", label: "Year", width: "60px", render: (it) => <span className="mono" style={{ fontSize: 12, color: "var(--text-sub)" }}>{s(it.year)}</span> },
    ],
    searchKeys: ["title", "client", "industry", "metric"],
    defaults: { industry: "Fintech", year: new Date().getFullYear(), span: 4, status: "Live", color: "#4F8BFF" },
    newId: (form, items) => {
      const base = slug(s(form.client)) || "case";
      const taken = new Set(items.map((i) => i.id));
      let id = `case-${base}`;
      let n = 2;
      while (taken.has(id)) id = `case-${base}-${n++}`;
      return id;
    },
    idOf: (it) => s(it.id),
    previewPath: (it) => `/portfolio/${it.id}`,
    normalize: (p) => ({ ...p, thumb: (s(p.thumb).toUpperCase().slice(0, 1) || s(p.client).charAt(0).toUpperCase()) }),
  },
  {
    key: "posts",
    label: "Blog",
    singular: "post",
    blurb: "Articles on the blog. Drafts stay hidden from the public site.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "author", label: "Author", type: "text", half: true, required: true },
      { key: "category", label: "Category", type: "select", half: true, options: POST_CATEGORIES },
      { key: "date", label: "Display date", type: "text", half: true, placeholder: "May 12, 2026" },
      { key: "read", label: "Read time", type: "text", half: true, placeholder: "5 min" },
      { key: "status", label: "Status", type: "select", half: true, options: ["Draft", "Published"] },
      { key: "excerpt", label: "Excerpt", type: "textarea", rows: 2, help: "Teaser shown on cards." },
      { key: "body", label: "Body", type: "textarea", rows: 12, mono: true, required: true, help: "Blank line between paragraphs." },
      { key: "image", label: "Cover image", type: "image", publicIdKey: "imagePublicId" },
    ],
    columns: [
      { key: "title", label: "Post", width: "1fr", render: (it) => <TitleCell thumb={<Thumb image={s(it.image) || undefined} letter={s(it.title).charAt(0).toUpperCase()} />} title={s(it.title)} sub={`${s(it.author)} · ${s(it.read)} · ${s(it.id)}`} /> },
      { key: "category", label: "Category", width: "120px", render: (it) => <Chip label={s(it.category)} /> },
      { key: "views", label: "Views", width: "70px", render: (it) => <span className="mono" style={{ fontSize: 12, color: "var(--text-sub)" }}>{typeof it.views === "number" && it.views ? it.views.toLocaleString() : "—"}</span> },
      { key: "status", label: "Status", width: "100px", render: (it) => <Status value={s(it.status)} /> },
      { key: "date", label: "Date", width: "110px", render: (it) => <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{s(it.date)}</span> },
    ],
    searchKeys: ["title", "author", "category"],
    defaults: {
      category: "Engineering",
      status: "Draft",
      read: "5 min",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    },
    newId: (form, items) => {
      const base = slug(s(form.title)).slice(0, 48) || "post";
      const taken = new Set(items.map((i) => i.id));
      let id = base;
      let n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      return id;
    },
    idOf: (it) => s(it.id),
    previewPath: (it) => `/blog/${it.id}`,
    createExtras: { views: 0 },
  },
  {
    key: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    blurb: "Client quotes. Featured ones appear on the home page.",
    fields: [
      { key: "quote", label: "Quote", type: "textarea", rows: 4, required: true },
      { key: "author", label: "Author", type: "text", half: true, required: true },
      { key: "role", label: "Role", type: "text", half: true, required: true, placeholder: "CTO, Meridian Capital" },
      { key: "featured", label: "Featured on home page", type: "toggle" },
      { key: "avatar", label: "Author photo", type: "image", aspect: "1/1", publicIdKey: "avatarPublicId", help: "Square headshot. Falls back to initials." },
    ],
    columns: [
      { key: "quote", label: "Quote", width: "1fr", render: (it) => <TitleCell thumb={<Thumb round image={s(it.avatar) || undefined} letter={initials(s(it.author))} />} title={<span className="italic-serif" style={{ fontWeight: 400 }}>“{s(it.quote)}”</span>} sub={`${s(it.author)} · ${s(it.role)}`} /> },
      { key: "featured", label: "Featured", width: "100px", render: (it) => (it.featured ? <Chip label="Featured" color="var(--accent)" /> : <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>—</span>) },
    ],
    searchKeys: ["quote", "author", "role"],
    defaults: { featured: false },
    newId: (form, items) => {
      const base = `t-${slug(s(form.author))}` || `t-${Date.now().toString(36)}`;
      const taken = new Set(items.map((i) => i.id));
      let id = base;
      let n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      return id;
    },
    idOf: (it) => s(it.id),
    previewPath: () => "/",
  },
  {
    key: "team",
    label: "Team",
    singular: "team member",
    blurb: "People shown on the public About page (separate from CRM staff accounts).",
    fields: [
      { key: "name", label: "Name", type: "text", half: true, required: true },
      { key: "role", label: "Role", type: "text", half: true, required: true, placeholder: "Chief Technology Officer" },
      { key: "focus", label: "Focus", type: "text", half: true, required: true, placeholder: "Architecture, Platform" },
      { key: "initials", label: "Initials", type: "text", half: true, maxLength: 3, help: "Fallback when there is no photo; derived from the name if blank." },
      { key: "avatar", label: "Photo", type: "image", aspect: "1/1", publicIdKey: "avatarPublicId", help: "Square headshot, 400×400 or larger." },
    ],
    columns: [
      { key: "name", label: "Member", width: "1fr", render: (it) => <TitleCell thumb={<Thumb round image={s(it.avatar) || undefined} letter={s(it.initials) || initials(s(it.name))} />} title={s(it.name)} sub={s(it.role)} /> },
      { key: "focus", label: "Focus", width: "220px", render: (it) => <span style={{ fontSize: 12.5, color: "var(--text-sub)" }}>{s(it.focus)}</span> },
    ],
    searchKeys: ["name", "role", "focus"],
    defaults: {},
    newId: (form, items) => {
      const base = `team-${slug(s(form.name))}`;
      const taken = new Set(items.map((i) => i.id));
      let id = base;
      let n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      return id;
    },
    idOf: (it) => s(it.id),
    previewPath: () => "/about",
    normalize: (p) => ({ ...p, initials: (s(p.initials).trim() || initials(s(p.name))).toUpperCase().slice(0, 3) }),
  },
  {
    key: "careers",
    label: "Careers",
    singular: "job opening",
    blurb: "Open roles on the careers page. Applications land in the CRM inbox.",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "Senior Platform Engineer" },
      { key: "team", label: "Team", type: "select", half: true, options: TEAMS },
      { key: "location", label: "Location", type: "text", half: true, required: true, placeholder: "Remote (Global)" },
      { key: "type", label: "Type", type: "select", half: true, options: JOB_TYPES },
      { key: "level", label: "Level", type: "select", half: true, options: LEVELS },
      { key: "posted", label: "Posted (display)", type: "text", half: true, placeholder: "3d ago" },
      { key: "status", label: "Status", type: "select", half: true, options: ["Open", "Closed"] },
      { key: "applicants", label: "Applicant count", type: "number", half: true, help: "Increments automatically on new applications." },
    ],
    columns: [
      { key: "title", label: "Role", width: "1fr", render: (it) => <TitleCell title={s(it.title)} sub={`${s(it.level)} · ${s(it.type)} · ${s(it.location)}`} /> },
      { key: "team", label: "Team", width: "110px", render: (it) => <Chip label={s(it.team)} /> },
      { key: "applicants", label: "Applicants", width: "90px", render: (it) => <span className="mono" style={{ fontSize: 12, color: "var(--text-sub)" }}>{s(it.applicants) || "0"}</span> },
      { key: "status", label: "Status", width: "90px", render: (it) => <Status value={s(it.status)} /> },
      { key: "posted", label: "Posted", width: "90px", render: (it) => <span className="mono" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{s(it.posted)}</span> },
    ],
    searchKeys: ["title", "team", "location", "level"],
    defaults: { team: "Engineering", location: "Remote (Global)", type: "Full-time", level: "Senior", posted: "just now", status: "Open", applicants: 0 },
    newId: (form, items) => {
      const base = `j-${slug(s(form.title)).slice(0, 40)}`;
      const taken = new Set(items.map((i) => i.id));
      let id = base;
      let n = 2;
      while (taken.has(id)) id = `${base}-${n++}`;
      return id;
    },
    idOf: (it) => s(it.id),
    previewPath: () => "/careers",
  },
];

export const COLLECTION_BY_KEY: Record<ContentCollection, CollectionDef> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c]),
) as Record<ContentCollection, CollectionDef>;
