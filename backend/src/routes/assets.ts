import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { postForAsset, unpost, depreciationOf } from "../lib/ledger.js";
import type { FixedAsset } from "../types.js";

const router = Router();
router.use(requireAuth);

function enrich(a: FixedAsset) {
  const dep = depreciationOf(a);
  return {
    ...clean(a),
    monthlyDepreciation: dep.monthly,
    accumulatedDepreciation: dep.accumulated,
    netBookValue: dep.nbv,
  };
}

async function nextAssetId(): Promise<string> {
  const year = new Date().getFullYear();
  const all = await collections.assets().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const a of all) {
    const m = String(a.id).match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `FA-${year}-${String(max + 1).padStart(3, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const assets = await collections.assets().find().sort({ createdAt: -1 }).toArray();
    res.json(assets.map(enrich));
  }),
);

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  currency: z.enum(["BDT", "USD"]).optional(),
  cost: z.number().positive(),
  salvage: z.number().min(0).optional(),
  usefulLifeYears: z.number().positive(),
  purchaseDate: z.string().optional(),
  fundedFrom: z.enum(["bank", "payable"]).optional(),
  status: z.enum(["Active", "Disposed"]).optional(),
  note: z.string().optional(),
});

router.post(
  "/",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid asset");
    const b = parsed.data;
    const asset: FixedAsset = {
      id: await nextAssetId(),
      name: b.name,
      category: b.category,
      currency: b.currency ?? "BDT",
      cost: b.cost,
      salvage: b.salvage ?? 0,
      usefulLifeYears: b.usefulLifeYears,
      purchaseDate: b.purchaseDate ?? new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      status: b.status ?? "Active",
      fundedFrom: b.fundedFrom ?? "bank",
      note: b.note ?? "",
      createdBy: req.user!.id,
      createdAt: new Date(),
    };
    await collections.assets().insertOne(asset);
    await postForAsset(asset, req.user!.id).catch(() => {});
    res.status(201).json(enrich(asset));
  }),
);

router.patch(
  "/:id",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const result = await collections.assets().findOneAndUpdate(
      { id: req.params.id },
      { $set: parsed.data },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Asset not found");
    await postForAsset(result, req.user!.id).catch(() => {});
    res.json(enrich(result));
  }),
);

router.delete(
  "/:id",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const result = await collections.assets().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) throw notFound("Asset not found");
    await unpost("asset", String(req.params.id));
    res.json({ ok: true });
  }),
);

export default router;
