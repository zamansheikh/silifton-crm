import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { cloudinary, cloudinaryEnabled } from "../lib/cloudinary.js";
import { postForExpense, unpost } from "../lib/ledger.js";
import { assertOpen } from "../lib/closing.js";
import { env } from "../env.js";
import type { Expense } from "../types.js";

const router = Router();
router.use(requireAuth);

const round2 = (n: number) => Math.round(n * 100) / 100;

async function nextExpenseId(): Promise<string> {
  const year = new Date().getFullYear();
  const all = await collections.expenses().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const e of all) {
    const m = String(e.id).match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `EXP-${year}-${String(max + 1).padStart(3, "0")}`;
}

async function uploadReceipt(dataUrl: string, expenseId: string) {
  const b64 = dataUrl.split(",")[1] ?? "";
  if (Math.floor((b64.length * 3) / 4) > env.uploadMaxBytes) {
    throw badRequest(`Receipt exceeds the ${Math.round(env.uploadMaxBytes / 1048576)}MB limit`);
  }
  const up = await cloudinary.uploader.upload(dataUrl, {
    folder: `${env.cloudinaryFolder}/expenses/${expenseId}`,
    resource_type: "auto",
  });
  return { receiptUrl: up.secure_url, receiptPublicId: up.public_id };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    const list = await collections.expenses().find(filter).sort({ createdAt: -1 }).toArray();
    res.json(cleanAll(list));
  }),
);

const createSchema = z.object({
  category: z.string().min(1),
  vendor: z.string().optional(),
  project: z.string().nullable().optional(),
  currency: z.enum(["BDT", "USD"]).optional(),
  amount: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).optional(),
  date: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(["Pending", "Approved", "Reimbursed", "Paid"]).optional(),
  receiptDataUrl: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid expense");
    const b = parsed.data;
    await assertOpen(b.date ?? new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }));
    const id = await nextExpenseId();
    const vatRate = b.vatRate ?? 0;
    const vat = round2((b.amount * vatRate) / 100);

    let receipt: { receiptUrl?: string; receiptPublicId?: string } = {};
    if (b.receiptDataUrl) {
      if (!cloudinaryEnabled) throw badRequest("Receipt uploads are not configured");
      receipt = await uploadReceipt(b.receiptDataUrl, id);
    }

    const expense: Expense = {
      id,
      category: b.category,
      vendor: b.vendor ?? "",
      project: b.project ?? null,
      currency: b.currency ?? "BDT",
      amount: round2(b.amount),
      vatRate,
      vat,
      total: round2(b.amount + vat),
      date: b.date ?? new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      note: b.note ?? "",
      status: b.status ?? "Pending",
      ...receipt,
      createdBy: req.user!.id,
      createdAt: new Date(),
    };
    await collections.expenses().insertOne(expense);
    await postForExpense(expense, req.user!.id).catch(() => {});
    res.status(201).json(clean(expense));
  }),
);

const updateSchema = createSchema.partial();

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const current = await collections.expenses().findOne({ id: req.params.id });
    if (!current) throw notFound("Expense not found");
    await assertOpen(current.date);
    if (parsed.data.date) await assertOpen(parsed.data.date);

    const b = parsed.data;
    const update: Record<string, unknown> = {};
    for (const k of ["category", "vendor", "project", "currency", "date", "note", "status"] as const) {
      if (b[k] !== undefined) update[k] = b[k];
    }
    const amount = b.amount ?? current.amount;
    const vatRate = b.vatRate ?? current.vatRate;
    if (b.amount !== undefined || b.vatRate !== undefined) {
      update.amount = round2(amount);
      update.vatRate = vatRate;
      update.vat = round2((amount * vatRate) / 100);
      update.total = round2(amount + (amount * vatRate) / 100);
    }
    if (b.receiptDataUrl) {
      if (!cloudinaryEnabled) throw badRequest("Receipt uploads are not configured");
      const r = await uploadReceipt(b.receiptDataUrl, current.id);
      update.receiptUrl = r.receiptUrl;
      update.receiptPublicId = r.receiptPublicId;
    }

    const result = await collections.expenses().findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after" },
    );
    await postForExpense(result!, req.user!.id).catch(() => {});
    res.json(clean(result!));
  }),
);

router.delete(
  "/:id",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const expense = await collections.expenses().findOne({ id: req.params.id });
    if (!expense) throw notFound("Expense not found");
    await assertOpen(expense.date);
    if (expense.receiptPublicId && cloudinaryEnabled) {
      await cloudinary.uploader.destroy(expense.receiptPublicId).catch(() => {});
    }
    await collections.expenses().deleteOne({ id: req.params.id });
    await unpost("expense", String(req.params.id));
    res.json({ ok: true });
  }),
);

export default router;
