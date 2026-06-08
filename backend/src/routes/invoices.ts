import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { postForInvoice, unpost } from "../lib/ledger.js";
import { assertOpen } from "../lib/closing.js";
import type { Invoice, InvoiceLine } from "../types.js";

const router = Router();
router.use(requireAuth);

const round2 = (n: number) => Math.round(n * 100) / 100;

function totals(lines: InvoiceLine[], vatRate: number, fallbackAmount?: number) {
  const subtotal = lines.length
    ? round2(lines.reduce((s, l) => s + l.qty * l.rate, 0))
    : round2(fallbackAmount ?? 0);
  const vat = round2((subtotal * vatRate) / 100);
  return { subtotal, vat, amount: round2(subtotal + vat) };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const invoices = await collections.invoices().find().toArray();
    res.json(
      cleanAll(
        invoices.filter(
          (i) =>
            (!req.query.client || i.client === req.query.client) &&
            (!req.query.status || i.status === req.query.status),
        ),
      ),
    );
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const inv = await collections.invoices().findOne({ id: req.params.id });
    if (!inv) throw notFound("Invoice not found");
    res.json(clean(inv));
  }),
);

const lineSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  rate: z.number().nonnegative(),
});

const createSchema = z.object({
  client: z.string().min(1),
  currency: z.enum(["BDT", "USD"]).optional(),
  lines: z.array(lineSchema).optional(),
  amount: z.number().positive().optional(), // legacy / quick total
  vatRate: z.number().min(0).max(100).optional(),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).optional(),
  dueIn: z.string().optional(),
  notes: z.string().optional(),
});

async function nextInvoiceId(): Promise<string> {
  const year = new Date().getFullYear();
  const invoices = await collections.invoices().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const inv of invoices) {
    const m = String(inv.id).match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `INV-${year}-${String(max + 1).padStart(3, "0")}`;
}

router.post(
  "/",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid invoice");
    const b = parsed.data;
    const lines = b.lines ?? [];
    if (!lines.length && !b.amount) throw badRequest("Add at least one line item or an amount");
    const vatRate = b.vatRate ?? 0;
    const { subtotal, vat, amount } = totals(lines, vatRate, b.amount);

    const invoice: Invoice = {
      id: await nextInvoiceId(),
      client: b.client,
      currency: b.currency ?? "BDT",
      lines,
      subtotal,
      vatRate,
      vat,
      amount,
      status: b.status ?? "Draft",
      dueIn: b.dueIn ?? "30d",
      issued: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      notes: b.notes,
    };
    await assertOpen(invoice.issued);
    await collections.invoices().insertOne(invoice);
    await postForInvoice(invoice, req.user!.id).catch(() => {});
    res.status(201).json(clean(invoice));
  }),
);

router.patch(
  "/:id",
  requireRole("pm", "accountant"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).optional(),
      currency: z.enum(["BDT", "USD"]).optional(),
      lines: z.array(lineSchema).optional(),
      amount: z.number().optional(),
      vatRate: z.number().min(0).max(100).optional(),
      dueIn: z.string().optional(),
      notes: z.string().optional(),
      paymentMethod: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const current = await collections.invoices().findOne({ id: req.params.id });
    if (!current) throw notFound("Invoice not found");
    await assertOpen(current.issued);

    const b = parsed.data;
    const update: Record<string, unknown> = {};
    for (const k of ["status", "currency", "dueIn", "notes", "paymentMethod"] as const) {
      if (b[k] !== undefined) update[k] = b[k];
    }
    if (b.status === "Paid" && current.status !== "Paid") {
      update.paidOn = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    }
    // Recompute money if lines / amount / vatRate change.
    if (b.lines !== undefined || b.amount !== undefined || b.vatRate !== undefined) {
      const lines = b.lines ?? current.lines ?? [];
      const vatRate = b.vatRate ?? current.vatRate ?? 0;
      const { subtotal, vat, amount } = totals(lines, vatRate, b.amount ?? current.amount);
      update.lines = lines;
      update.vatRate = vatRate;
      update.subtotal = subtotal;
      update.vat = vat;
      update.amount = amount;
    }

    const result = await collections.invoices().findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after" },
    );
    await postForInvoice(result!, req.user!.id).catch(() => {});
    res.json(clean(result!));
  }),
);

router.delete(
  "/:id",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const invoice = await collections.invoices().findOne({ id: req.params.id });
    if (!invoice) throw notFound("Invoice not found");
    // Don't alter a closed accounting period — its books are frozen.
    await assertOpen(invoice.issued);
    // Remove the invoice's ledger entries so the journal stays balanced.
    await unpost("invoice", invoice.id);
    await collections.invoices().deleteOne({ id: invoice.id });
    res.json({ ok: true });
  }),
);

export default router;
