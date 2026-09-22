// Job applications submitted from the careers page. Public create, CRM triage.
import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import type { Collection, Document } from "mongodb";
import { web, stripAll, stripDoc } from "./db.js";
import type { Application } from "./types.js";

const router = Router();

const STAGES = ["New", "Tech screen", "Portfolio review", "Hiring manager", "Onsite", "Offer", "Hired", "Rejected"] as const;

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions — please try again later." },
});

const createSchema = z.object({
  candidate: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  roleId: z.string().trim().min(1).max(120),
  linkedin: z.string().trim().max(200).optional(),
  portfolio: z.string().trim().max(200).optional(),
  note: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(80).optional(),
});

const updateSchema = z.object({
  stage: z.enum(STAGES).optional(),
  score: z.number().int().min(0).max(100).optional(),
});

async function nextId(): Promise<string> {
  const latest = await web.applications().find({ id: /^APP-/ }).sort({ id: -1 }).limit(1).project<{ id: string }>({ id: 1 }).toArray();
  const last = latest[0] ? parseInt(latest[0].id.replace(/^APP-/, ""), 10) : 1042;
  return `APP-${(Number.isFinite(last) ? last : 1042) + 1}`;
}

// ---- public: careers form ----
router.post(
  "/",
  publicLimiter,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid application");
    const b = parsed.data;
    // The form posts the career's id; store the human-readable title when we can.
    const career = await web.content("careers").findOne({ id: b.roleId });
    const now = new Date();
    const app: Application = {
      id: await nextId(),
      candidate: b.candidate,
      email: b.email,
      role: typeof career?.title === "string" ? career.title : b.roleId,
      stage: "New",
      score: 0,
      date: now.toISOString().slice(0, 10),
      source: b.source || "Careers page",
      ...(b.linkedin ? { linkedin: b.linkedin } : {}),
      ...(b.portfolio ? { portfolio: b.portfolio } : {}),
      ...(b.note ? { note: b.note } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await web.applications().insertOne(app);
    if (career) {
      await (web.content("careers") as unknown as Collection<Document>).updateOne({ id: career.id }, { $inc: { applicants: 1 } });
    }
    res.status(201).json(stripDoc(app));
  }),
);

// ---- CRM: pipeline ----
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await web.applications().find().sort({ date: -1 }).toArray();
    res.json(stripAll(items));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await web.applications().findOne({ id: String(req.params.id) });
    if (!item) throw notFound("Application not found");
    res.json(stripDoc(item));
  }),
);

router.patch(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid update");
    const result = await web.applications().findOneAndUpdate(
      { id: String(req.params.id) },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Application not found");
    res.json(stripDoc(result));
  }),
);

router.delete(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const result = await web.applications().deleteOne({ id: String(req.params.id) });
    if (result.deletedCount === 0) throw notFound("Application not found");
    res.status(204).end();
  }),
);

export default router;
