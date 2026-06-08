import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import type { Client } from "../types.js";

const router = Router();
router.use(requireAuth);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await collections.clients().find().toArray();
    res.json(cleanAll(clients));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await collections.clients().findOne({ id: req.params.id });
    if (!client) throw notFound("Client not found");
    res.json(clean(client));
  }),
);

const createSchema = z.object({
  name: z.string().min(2),
  industry: z.string().optional(),
  contact: z.string().optional(),
  currency: z.enum(["BDT", "USD"]).optional(),
  mrr: z.number().optional(),
  color: z.string().optional(),
  tier: z.enum(["Platinum", "Gold", "Silver", "Internal"]).optional(),
});

router.post(
  "/",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid client");
    const b = parsed.data;
    const id = slugify(b.name) || `client-${Date.now()}`;
    if (await collections.clients().findOne({ id })) throw badRequest("Client already exists");
    const client: Client = {
      id,
      name: b.name,
      industry: b.industry ?? "—",
      contact: b.contact ?? "—",
      since: new Date().toISOString().slice(0, 7),
      currency: b.currency ?? "BDT",
      mrr: b.mrr ?? 0,
      billed: 0,
      outstanding: 0,
      projects: 0,
      color: b.color ?? "#a855f7",
      logo: b.name[0]?.toUpperCase() ?? "?",
      tier: b.tier ?? "Silver",
    };
    await collections.clients().insertOne(client);
    res.status(201).json(client);
  }),
);

router.patch(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const schema = createSchema.partial().extend({
      billed: z.number().optional(),
      outstanding: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const result = await collections.clients().findOneAndUpdate(
      { id: req.params.id },
      { $set: parsed.data },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Client not found");
    res.json(clean(result));
  }),
);

router.delete(
  "/:id",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const result = await collections.clients().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) throw notFound("Client not found");
    res.json({ ok: true });
  }),
);

export default router;
