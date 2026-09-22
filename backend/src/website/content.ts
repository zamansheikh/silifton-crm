// Public-website content collections (services, portfolio, posts, team,
// testimonials, careers). Reads are public so the marketing site can render;
// writes need a signed-in CRM user with project-management rights.
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { web, stripAll, stripDoc } from "./db.js";
import { CONTENT_COLLECTIONS, type ContentCollection, type ContentDoc } from "./types.js";

const router = Router();

function assertCollection(value: string): ContentCollection {
  if (!(CONTENT_COLLECTIONS as readonly string[]).includes(value)) {
    throw badRequest(`Unknown collection '${value}'`);
  }
  return value as ContentCollection;
}

// Services use their display order ("01", "02") as the natural key, so allow
// lookups by either field.
const byId = (c: ContentCollection, id: string) =>
  c === "services" ? { $or: [{ id }, { num: id }] } : { id };

const bodySchema = z.record(z.string(), z.unknown());

// Fields the client may never set directly.
const RESERVED = new Set(["_id", "__v", "createdAt", "updatedAt"]);
function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (!RESERVED.has(k)) out[k] = v;
  return out;
}

router.get(
  "/:collection",
  asyncHandler(async (req, res) => {
    const c = assertCollection(String(req.params.collection));
    // Services carry an explicit display order ("01", "02"…); everything else
    // lists in creation order.
    const items = await web.content(c).find().sort(c === "services" ? { num: 1 } : { createdAt: 1 }).toArray();
    res.json(stripAll(items));
  }),
);

router.get(
  "/:collection/:id",
  asyncHandler(async (req, res) => {
    const c = assertCollection(String(req.params.collection));
    const item = await web.content(c).findOne(byId(c, String(req.params.id)));
    if (!item) throw notFound(`${c}/${String(req.params.id)} not found`);
    res.json(stripDoc(item));
  }),
);

router.post(
  "/:collection",
  requireAuth,
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const c = assertCollection(String(req.params.collection));
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid payload");
    const payload = sanitize(parsed.data);
    const fallback = c === "services" && typeof payload.num === "string" ? payload.num : `${c.slice(0, 3)}-${Date.now()}`;
    const id = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : fallback;
    if (await web.content(c).findOne({ id })) throw badRequest(`An item with id '${id}' already exists`);
    const now = new Date();
    const doc: ContentDoc = { ...payload, id, createdAt: now, updatedAt: now };
    await web.content(c).insertOne(doc);
    res.status(201).json(stripDoc(doc));
  }),
);

router.patch(
  "/:collection/:id",
  requireAuth,
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const c = assertCollection(String(req.params.collection));
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid payload");
    const patch = sanitize(parsed.data);
    delete patch.id; // ids are immutable — they're referenced by public URLs
    const result = await web.content(c).findOneAndUpdate(
      byId(c, String(req.params.id)),
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw notFound(`${c}/${String(req.params.id)} not found`);
    res.json(stripDoc(result));
  }),
);

router.delete(
  "/:collection/:id",
  requireAuth,
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const c = assertCollection(String(req.params.collection));
    const result = await web.content(c).deleteOne(byId(c, String(req.params.id)));
    if (result.deletedCount === 0) throw notFound(`${c}/${String(req.params.id)} not found`);
    res.status(204).end();
  }),
);

export default router;
