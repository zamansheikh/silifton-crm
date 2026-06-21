import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { collections, clean } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, forbidden, notFound } from "../lib/http.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import type { Credential, CredentialField } from "../types.js";

const router = Router();
router.use(requireAuth);

// Only the founder (highest position) owns the vault: sees everything, and is
// the sole manager who can create/edit/delete/share/import/export. Other
// members see only the entries explicitly shared with them, read-only.
function requireFounder(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.appRole !== "founder") return next(forbidden("Credentials are managed by the founder"));
  next();
}

const CATEGORIES = ["VPS", "Domain", "Database", "API", "Email", "Cloud", "Service", "Other"] as const;

const fieldSchema = z.object({
  label: z.string().min(1),
  value: z.string().default(""),
  secret: z.boolean().optional(),
});

const credentialSchema = z.object({
  title: z.string().min(1),
  category: z.enum(CATEGORIES).default("Other"),
  url: z.string().optional(),
  notes: z.string().optional(),
  fields: z.array(fieldSchema).default([]),
  tags: z.array(z.string()).default([]),
  sharedWith: z.array(z.string()).default([]),
});

const genId = () => `cred-${crypto.randomBytes(5).toString("hex")}`;

// Encrypt secret-bearing parts before persisting.
function encryptFields(fields: { label: string; value: string; secret?: boolean }[]): CredentialField[] {
  return fields.map((f) => ({ label: f.label, value: encrypt(f.value ?? ""), secret: !!f.secret }));
}

// Decrypt for an authorized response.
function toView(doc: Credential): Credential {
  const c = clean(doc) as Credential;
  return {
    ...c,
    fields: (c.fields ?? []).map((f) => ({ label: f.label, value: decrypt(f.value), secret: !!f.secret })),
    notes: c.notes ? decrypt(c.notes) : "",
  };
}

const isFounder = (req: Request) => req.user?.appRole === "founder";
const canView = (c: Credential, req: Request) => isFounder(req) || c.sharedWith?.includes(req.user!.id);

// ── Whether the current user can see the vault at all (for nav gating). ──
router.get(
  "/access",
  asyncHandler(async (req, res) => {
    if (isFounder(req)) return res.json({ canAccess: true });
    const count = await collections.credentials().countDocuments({ sharedWith: req.user!.id });
    res.json({ canAccess: count > 0 });
  }),
);

// ── Export the whole vault as decrypted JSON (founder only). ──
router.get(
  "/export",
  requireFounder,
  asyncHandler(async (_req, res) => {
    const docs = await collections.credentials().find().sort({ createdAt: 1 }).toArray();
    res.json(docs.map(toView));
  }),
);

// ── List entries visible to the current user. ──
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = isFounder(req) ? {} : { sharedWith: req.user!.id };
    const docs = await collections.credentials().find(filter).sort({ updatedAt: -1 }).toArray();
    res.json(docs.map(toView));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await collections.credentials().findOne({ id: req.params.id });
    if (!doc) throw notFound("Credential not found");
    if (!canView(doc, req)) throw forbidden("You don't have access to this credential");
    res.json(toView(doc));
  }),
);

router.post(
  "/",
  requireFounder,
  asyncHandler(async (req, res) => {
    const parsed = credentialSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid credential");
    const b = parsed.data;
    const now = new Date();
    const doc: Credential = {
      id: genId(),
      title: b.title,
      category: b.category,
      url: b.url,
      notes: b.notes ? encrypt(b.notes) : "",
      fields: encryptFields(b.fields),
      tags: b.tags,
      sharedWith: b.sharedWith,
      createdBy: req.user!.id,
      createdAt: now,
      updatedAt: now,
    };
    await collections.credentials().insertOne(doc);
    res.status(201).json(toView(doc));
  }),
);

router.patch(
  "/:id",
  requireFounder,
  asyncHandler(async (req, res) => {
    const parsed = credentialSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid update");
    const b = parsed.data;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (b.title !== undefined) update.title = b.title;
    if (b.category !== undefined) update.category = b.category;
    if (b.url !== undefined) update.url = b.url;
    if (b.tags !== undefined) update.tags = b.tags;
    if (b.sharedWith !== undefined) update.sharedWith = b.sharedWith;
    if (b.fields !== undefined) update.fields = encryptFields(b.fields);
    if (b.notes !== undefined) update.notes = b.notes ? encrypt(b.notes) : "";

    const result = await collections
      .credentials()
      .findOneAndUpdate({ id: req.params.id }, { $set: update }, { returnDocument: "after" });
    if (!result) throw notFound("Credential not found");
    res.json(toView(result));
  }),
);

router.delete(
  "/:id",
  requireFounder,
  asyncHandler(async (req, res) => {
    const result = await collections.credentials().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) throw notFound("Credential not found");
    res.json({ ok: true });
  }),
);

// ── Import from JSON (founder only). mode: "merge" (upsert by id, default) or
//    "replace" (wipe the vault first). Incoming plaintext values are encrypted. ──
const importSchema = z.object({
  mode: z.enum(["merge", "replace"]).default("merge"),
  items: z.array(credentialSchema.extend({ id: z.string().optional() })),
});

router.post(
  "/import",
  requireFounder,
  asyncHandler(async (req, res) => {
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid import payload");
    const { mode, items } = parsed.data;
    const now = new Date();

    if (mode === "replace") {
      await collections.credentials().deleteMany({});
    }

    let count = 0;
    for (const item of items) {
      const doc: Credential = {
        id: mode === "merge" && item.id ? item.id : genId(),
        title: item.title,
        category: item.category,
        url: item.url,
        notes: item.notes ? encrypt(item.notes) : "",
        fields: encryptFields(item.fields),
        tags: item.tags,
        sharedWith: item.sharedWith,
        createdBy: req.user!.id,
        createdAt: now,
        updatedAt: now,
      };
      await collections.credentials().updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
      count++;
    }
    res.json({ ok: true, count });
  }),
);

export default router;
