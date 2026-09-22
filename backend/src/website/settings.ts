// Key/value site settings (hero copy, footer, SEO…). A whitelist of keys is
// readable anonymously by the marketing site; everything is editable from the CRM.
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest } from "../lib/http.js";
import { web } from "./db.js";

export const PUBLIC_KEYS = new Set(["site.hero", "site.about", "site.footer", "site.social", "site.seo"]);
const ALL_KEYS = [...PUBLIC_KEYS, "workspace.general"];

const DEFAULTS: Record<string, Record<string, unknown>> = {
  "site.hero": {
    eyebrow: "Silifton / Engineered software",
    headline: "We build the software serious teams stake their roadmap on.",
    sub: "A senior-only engineering studio for fintech, health, and AI-native products.",
    primaryCta: "Start a project",
    primaryCtaHref: "/contact",
    secondaryCta: "See selected work",
    secondaryCtaHref: "/portfolio",
    showStats: true,
    showMarquee: true,
    background: "",
  },
  "site.about": {
    headline: "A studio of operators, not consultants.",
    intro: "Silifton was founded in 2019 by engineers who'd led platform teams at scaled software companies.",
  },
  "site.footer": {
    tagline: "Senior-only engineering studio. Production or it didn't happen.",
    address: "Dhaka · London · Lagos",
    email: "hello@silifton.com",
    copyright: `© ${new Date().getFullYear()} Silifton. All rights reserved.`,
  },
  "site.social": { twitter: "", linkedin: "", github: "", youtube: "" },
  "site.seo": {
    title: "Silifton — Engineered software for serious teams",
    description: "A senior-only engineering studio for fintech, health, and AI-native products.",
    keywords: "software studio, fintech, healthtech, AI engineering, senior engineers",
    ogImage: "",
  },
  "workspace.general": {
    workspaceName: "Silifton",
    publicDomain: "silifton.com",
    adminDomain: "crm.silifton.com",
    timezone: "GMT+6 — Dhaka",
    siteOnline: true,
  },
};

async function getSetting(key: string): Promise<Record<string, unknown>> {
  const doc = await web.settings().findOne({ key });
  return { ...(DEFAULTS[key] ?? {}), ...(doc?.value ?? {}) };
}

async function getMany(keys: string[]): Promise<Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, unknown>> = {};
  await Promise.all(keys.map(async (k) => { out[k] = await getSetting(k); }));
  return out;
}

// ---- public ----
export const publicRouter = Router();

publicRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getMany([...PUBLIC_KEYS]));
  }),
);

publicRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    if (!PUBLIC_KEYS.has(String(req.params.key))) return res.json({});
    res.json(await getSetting(String(req.params.key)));
  }),
);

// ---- CRM ----
export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getMany(ALL_KEYS));
  }),
);

adminRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    res.json(await getSetting(String(req.params.key)));
  }),
);

const valueSchema = z.record(z.string(), z.unknown());

adminRouter.patch(
  "/:key",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const key = String(req.params.key);
    if (!/^[a-z]+\.[a-zA-Z]+$/.test(key)) throw badRequest("Invalid settings key");
    const parsed = valueSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Settings value must be an object");
    const now = new Date();
    await web.settings().updateOne(
      { key },
      { $set: { value: parsed.data, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    res.json(await getSetting(key));
  }),
);
