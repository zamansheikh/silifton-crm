// First-party page-view analytics for silifton.com. The site's /api/track
// route forwards a beacon here; the CRM reads the aggregates.
import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import type { Collection, Document } from "mongodb";
import { env } from "../env.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/http.js";
import { web } from "./db.js";
import type { PageView } from "./types.js";

const router = Router();

const SOURCE_COLORS: Record<string, string> = {
  Direct: "#3DDC9A",
  Referrals: "#4F7BE6",
  Search: "#F5A524",
  Social: "#C792EA",
  Other: "#FF5A5F",
};

function classifyReferrer(raw: string | undefined, ownHost: string): string {
  if (!raw) return "Direct";
  let host = "";
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return "Direct";
  }
  if (host === ownHost || host === `www.${ownHost}` || host.endsWith(`.${ownHost}`)) return "Direct";
  if (host.includes("google.") || host.includes("bing.") || host.includes("duckduckgo.") || host.includes("yahoo.")) return "Search";
  if (host.includes("twitter.") || host === "x.com" || host.endsWith(".x.com")) return "Social";
  if (host.includes("linkedin.") || host.includes("facebook.") || host.includes("instagram.")) return "Social";
  return "Referrals";
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monthLabel = (d: Date) => d.toLocaleString("en-US", { month: "short" });
const hashVisitor = (ip: string, ua: string, day: string) =>
  crypto.createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 16);

function last12Months(now: Date): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: monthLabel(d) });
  }
  return out;
}

async function monthlyVisitors(now: Date): Promise<Record<string, number>> {
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const rows = await web
    .pageViews()
    .aggregate<{ _id: string; visitors: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, uniques: { $addToSet: "$visitor" } } },
      { $project: { _id: 1, visitors: { $size: "$uniques" } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) out[r._id] = r.visitors;
  return out;
}

async function monthlyCount(col: Collection<Document>, now: Date): Promise<Record<string, number>> {
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const rows = await col
    .aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) out[r._id] = r.count;
  return out;
}

async function sources(now: Date): Promise<Array<{ label: string; value: number; color: string }>> {
  const since = new Date(now);
  since.setDate(since.getDate() - 30);
  const rows = await web
    .pageViews()
    .aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ])
    .toArray();
  const total = rows.reduce((a, r) => a + r.count, 0);
  if (total === 0) return Object.entries(SOURCE_COLORS).slice(0, 4).map(([label, color]) => ({ label, value: 0, color }));
  return rows
    .map((r) => ({ label: r._id || "Direct", value: Math.round((r.count / total) * 100), color: SOURCE_COLORS[r._id] ?? SOURCE_COLORS.Other }))
    .sort((a, b) => b.value - a.value);
}

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type Stamped = { createdAt?: Date; updatedAt?: Date; [k: string]: unknown };
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function activity(): Promise<Array<{ who: string; action: string; target: string; time: string }>> {
  const [inqs, apps, posts, port] = await Promise.all([
    web.inquiries().find().sort({ createdAt: -1 }).limit(5).toArray(),
    web.applications().find().sort({ createdAt: -1 }).limit(5).toArray(),
    web.content("posts").find().sort({ updatedAt: -1 }).limit(5).toArray(),
    web.content("portfolio").find().sort({ updatedAt: -1 }).limit(3).toArray(),
  ]);
  const items: Array<{ when: Date; who: string; action: string; target: string }> = [];
  for (const i of inqs as Stamped[]) items.push({ when: i.createdAt ?? new Date(0), who: "System", action: "received new inquiry from", target: `${str(i.name)} · ${str(i.company)}`.trim() });
  for (const a of apps as Stamped[]) items.push({ when: a.createdAt ?? new Date(0), who: "System", action: `moved candidate to ${str(a.stage) || "New"}:`, target: `${str(a.candidate)} — ${str(a.role)}` });
  for (const p of posts as Stamped[]) items.push({ when: p.updatedAt ?? new Date(0), who: str(p.author) || "Editor", action: p.status === "Published" ? "published" : "updated draft", target: str(p.title) });
  for (const c of port as Stamped[]) items.push({ when: c.updatedAt ?? new Date(0), who: "Editor", action: "updated case study", target: `${str(c.client)} — ${str(c.title)}` });
  items.sort((a, b) => b.when.getTime() - a.when.getTime());
  return items.slice(0, 10).map((x) => ({ who: x.who, action: x.action, target: x.target, time: relativeTime(x.when) }));
}

function pctTrend(xs: number[]): number {
  if (xs.length < 2) return 0;
  const last = xs[xs.length - 1] ?? 0;
  const prev = xs[xs.length - 2] ?? 0;
  if (prev === 0 && last === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}

// ---- public beacon ----
const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const trackSchema = z.object({ path: z.string().max(512), referrer: z.string().max(512).optional() });

router.post(
  "/track",
  trackLimiter,
  asyncHandler(async (req, res) => {
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid beacon");
    const ip = ((req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0] ?? req.ip ?? "0.0.0.0").trim();
    const ua = (req.headers["user-agent"] as string | undefined) ?? "";
    const day = dayKey(new Date());
    const view: PageView = {
      path: parsed.data.path,
      referrer: parsed.data.referrer ?? "",
      source: classifyReferrer(parsed.data.referrer, env.websiteHost),
      day,
      ua: ua.slice(0, 200),
      visitor: hashVisitor(ip, ua, day),
      createdAt: new Date(),
    };
    await web.pageViews().insertOne(view);
    res.status(204).end();
  }),
);

// ---- CRM dashboards ----
router.get(
  "/overview",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const months = last12Months(now);
    const visitorBuckets = await monthlyVisitors(now);
    const visitors = months.map((m) => visitorBuckets[m.key] ?? 0);
    const inquiryMonthly = await monthlyCount(web.inquiries() as unknown as Collection<Document>, now);
    const inquiries = months.map((m) => inquiryMonthly[m.key] ?? 0);
    const appMonthly = await monthlyCount(web.applications() as unknown as Collection<Document>, now);
    const apps = months.map((m) => appMonthly[m.key] ?? 0);
    const pipelineOpen = await web.inquiries().countDocuments({ status: { $in: ["New", "In review", "Replied"] } });
    const openCareers = await web.content("careers").countDocuments({ status: "Open" });
    const totalVisitors = visitors.reduce((a, b) => a + b, 0);
    const totalInquiries = inquiries.reduce((a, b) => a + b, 0);
    const totalApps = apps.reduce((a, b) => a + b, 0);
    res.json({
      kpis: [
        { label: "Visitors / mo", value: visitors[visitors.length - 1] ?? 0, total: totalVisitors, trend: pctTrend(visitors), spark: visitors, color: "var(--accent)" },
        { label: "Inquiries", value: inquiries[inquiries.length - 1] ?? 0, total: totalInquiries, trend: pctTrend(inquiries), spark: inquiries, color: "#4F7BE6" },
        { label: "Open pipeline", value: pipelineOpen, total: pipelineOpen, trend: 0, spark: inquiries, color: "#F5A524" },
        { label: "Open positions", value: openCareers, total: totalApps, trend: pctTrend(apps), spark: apps, color: "#C792EA" },
      ],
      months: months.map((m) => m.label),
      visitors,
      inquiries,
      sources: await sources(now),
      activity: await activity(),
    });
  }),
);

router.get(
  "/series",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const months = last12Months(now);
    const visitorBuckets = await monthlyVisitors(now);
    const visitors = months.map((m) => visitorBuckets[m.key] ?? 0);
    const since = new Date(now);
    since.setDate(since.getDate() - 30);
    const sinceDay = dayKey(since);

    const totalLast30 = await web.pageViews().countDocuments({ day: { $gte: sinceDay } });
    const uniques = await web.pageViews().distinct("visitor", { day: { $gte: sinceDay } });
    const bounced = await web
      .pageViews()
      .aggregate<{ bounced: number }>([
        { $match: { day: { $gte: sinceDay } } },
        { $group: { _id: "$visitor", pages: { $sum: 1 } } },
        { $match: { pages: 1 } },
        { $count: "bounced" },
      ])
      .toArray();
    const topPages = await web
      .pageViews()
      .aggregate<{ path: string; views: number; uniques: number }>([
        { $match: { day: { $gte: sinceDay } } },
        { $group: { _id: "$path", views: { $sum: 1 }, visitors: { $addToSet: "$visitor" } } },
        { $project: { path: "$_id", views: 1, uniques: { $size: "$visitors" }, _id: 0 } },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    const topReferrers = await web
      .pageViews()
      .aggregate<{ referrer: string; sessions: number; source: string }>([
        { $match: { day: { $gte: sinceDay }, referrer: { $ne: "" } } },
        { $group: { _id: "$referrer", sessions: { $sum: 1 }, source: { $first: "$source" } } },
        { $project: { referrer: "$_id", sessions: 1, source: 1, _id: 0 } },
        { $sort: { sessions: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const avgPages = uniques.length > 0 ? totalLast30 / uniques.length : 0;
    const bounceRate = uniques.length > 0 ? (bounced[0]?.bounced ?? 0) / uniques.length : 0;
    res.json({
      months: months.map((m) => m.label),
      visitors,
      totalLast30,
      uniquesLast30: uniques.length,
      avgPagesPerVisitor: Math.round(avgPages * 10) / 10,
      bounceRate: Math.round(bounceRate * 1000) / 10,
      topPages,
      topReferrers,
      sources: await sources(now),
    });
  }),
);

export default router;
