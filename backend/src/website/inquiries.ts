// Contact-form inquiries from silifton.com. Anyone may submit one (rate
// limited); reading and triaging them needs a CRM session.
import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { env } from "../env.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { web, stripAll, stripDoc } from "./db.js";
import type { Inquiry } from "./types.js";

const router = Router();

const BUDGETS = ["$50k–$100k", "$100k–$250k", "$250k–$500k", "$500k+", "Not sure yet"] as const;
const STATUSES = ["New", "In review", "Replied", "Won", "Closed"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions — please try again later." },
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(200).optional(),
  budget: z.enum(BUDGETS),
  message: z.string().trim().min(1).max(5000),
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

async function nextId(): Promise<string> {
  const latest = await web.inquiries().find({ id: /^INQ-/ }).sort({ id: -1 }).limit(1).project<{ id: string }>({ id: 1 }).toArray();
  const last = latest[0] ? parseInt(latest[0].id.replace(/^INQ-/, ""), 10) : 2418;
  return `INQ-${(Number.isFinite(last) ? last : 2418) + 1}`;
}

async function notify(inquiry: Inquiry): Promise<void> {
  if (!env.resendApiKey || !env.contactEmail) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendApiKey);
    await resend.emails.send({
      from: env.fromEmail,
      to: [env.contactEmail],
      replyTo: inquiry.email,
      subject: `[${inquiry.id}] ${inquiry.subject} — ${inquiry.company}`,
      text: [
        `New inquiry · ${inquiry.id}`,
        `From: ${inquiry.name} <${inquiry.email}> · ${inquiry.company}`,
        `Budget: ${inquiry.budget}`,
        `Priority: ${inquiry.priority}`,
        ``,
        inquiry.message,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[website] inquiry email failed:", err);
  }
}

// ---- public: contact form ----
router.post(
  "/",
  publicLimiter,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid inquiry");
    const b = parsed.data;
    const now = new Date();
    const inquiry: Inquiry = {
      id: await nextId(),
      name: b.name,
      company: b.company,
      email: b.email,
      subject: b.subject || "(no subject)",
      budget: b.budget,
      message: b.message,
      date: now.toISOString(),
      status: "New",
      priority: b.budget === "$500k+" ? "Critical" : b.budget === "$250k–$500k" ? "High" : "Medium",
      createdAt: now,
      updatedAt: now,
    };
    await web.inquiries().insertOne(inquiry);
    void notify(inquiry);
    res.status(201).json(stripDoc(inquiry));
  }),
);

// ---- CRM: inbox ----
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await web.inquiries().find().sort({ date: -1 }).toArray();
    res.json(stripAll(items));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await web.inquiries().findOne({ id: String(req.params.id) });
    if (!item) throw notFound("Inquiry not found");
    res.json(stripDoc(item));
  }),
);

router.patch(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const result = await web.inquiries().findOneAndUpdate(
      { id: String(req.params.id) },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Inquiry not found");
    res.json(stripDoc(result));
  }),
);

router.delete(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const result = await web.inquiries().deleteOne({ id: String(req.params.id) });
    if (result.deletedCount === 0) throw notFound("Inquiry not found");
    res.status(204).end();
  }),
);

export default router;
