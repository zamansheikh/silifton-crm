import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import type { TimeEntry, ActiveTimer } from "../types.js";

const router = Router();
router.use(requireAuth);

// Elapsed ms for a timer right now (banked + the live running segment).
function elapsedMs(t: ActiveTimer): number {
  const live = t.running && t.startedAt ? Date.now() - new Date(t.startedAt).getTime() : 0;
  return t.accumulatedMs + Math.max(0, live);
}
function timerView(t: ActiveTimer) {
  return {
    project: t.project,
    task: t.task,
    note: t.note,
    billable: t.billable,
    running: t.running,
    elapsedMs: elapsedMs(t),
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.person) filter.person = req.query.person;
    if (req.query.project) filter.project = req.query.project;
    if (req.query.mine === "1" && req.user) filter.person = req.user.id;
    const entries = await collections.time().find(filter).toArray();
    res.json(cleanAll(entries));
  }),
);

const createSchema = z.object({
  project: z.string().min(1),
  task: z.string().nullable().optional(),
  mins: z.number().int().positive(),
  billable: z.boolean().optional(),
  note: z.string().optional(),
  day: z.string().optional(),
  date: z.string().optional(),
  person: z.string().optional(),
});

async function nextTimeId(): Promise<string> {
  const entries = await collections.time().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const e of entries) {
    const n = Number(String(e.id).replace(/\D/g, ""));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `TE-${String(max + 1).padStart(4, "0")}`;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid time entry");
    const b = parsed.data;
    const now = new Date();
    const entry: TimeEntry = {
      id: await nextTimeId(),
      day: b.day ?? now.toLocaleDateString("en-US", { weekday: "short" }),
      date: b.date ?? now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      person: b.person ?? (req.user?.id as string),
      project: b.project,
      task: b.task ?? null,
      mins: b.mins,
      billable: b.billable ?? true,
      note: b.note ?? "",
      createdAt: now,
    };
    await collections.time().insertOne(entry);

    // Roll logged minutes into the task's spent hours.
    if (entry.task) {
      await collections.tasks().updateOne(
        { id: entry.task },
        { $inc: { spent: Math.round((entry.mins / 60) * 10) / 10 } },
      );
    }
    res.status(201).json(entry);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await collections.time().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) throw notFound("Time entry not found");
    res.json({ ok: true });
  }),
);

// ── Live timer ──────────────────────────────────────────────────────
// One active timer per user. Start replaces any existing one.

router.get(
  "/timer",
  asyncHandler(async (req, res) => {
    const t = await collections.timers().findOne({ person: req.user!.id });
    res.json(t ? timerView(t) : null);
  }),
);

const startSchema = z.object({
  project: z.string().min(1),
  task: z.string().nullable().optional(),
  note: z.string().optional(),
  billable: z.boolean().optional(),
});

router.post(
  "/timer/start",
  asyncHandler(async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("A project is required to start a timer");
    const b = parsed.data;
    const timer: ActiveTimer = {
      person: req.user!.id,
      project: b.project,
      task: b.task ?? null,
      note: b.note ?? "",
      billable: b.billable ?? true,
      running: true,
      startedAt: new Date(),
      accumulatedMs: 0,
    };
    await collections.timers().replaceOne({ person: req.user!.id }, timer, { upsert: true });
    res.status(201).json(timerView(timer));
  }),
);

router.post(
  "/timer/pause",
  asyncHandler(async (req, res) => {
    const t = await collections.timers().findOne({ person: req.user!.id });
    if (!t) throw notFound("No active timer");
    if (t.running && t.startedAt) {
      t.accumulatedMs += Math.max(0, Date.now() - new Date(t.startedAt).getTime());
    }
    t.running = false;
    t.startedAt = null;
    await collections.timers().replaceOne({ person: req.user!.id }, t);
    res.json(timerView(t));
  }),
);

router.post(
  "/timer/resume",
  asyncHandler(async (req, res) => {
    const t = await collections.timers().findOne({ person: req.user!.id });
    if (!t) throw notFound("No active timer");
    t.running = true;
    t.startedAt = new Date();
    await collections.timers().replaceOne({ person: req.user!.id }, t);
    res.json(timerView(t));
  }),
);

router.post(
  "/timer/stop",
  asyncHandler(async (req, res) => {
    const t = await collections.timers().findOne({ person: req.user!.id });
    if (!t) throw notFound("No active timer");
    const ms = elapsedMs(t);
    await collections.timers().deleteOne({ person: req.user!.id });

    const mins = Math.round(ms / 60000);
    if (mins <= 0) {
      res.json({ entry: null, mins: 0 });
      return;
    }
    const now = new Date();
    const entry: TimeEntry = {
      id: await nextTimeId(),
      day: now.toLocaleDateString("en-US", { weekday: "short" }),
      date: now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      person: req.user!.id,
      project: t.project,
      task: t.task,
      mins,
      billable: t.billable,
      note: t.note || "Timer session",
      createdAt: now,
    };
    await collections.time().insertOne(entry);
    if (entry.task) {
      await collections.tasks().updateOne(
        { id: entry.task },
        { $inc: { spent: Math.round((mins / 60) * 10) / 10 } },
      );
    }
    res.json({ entry, mins });
  }),
);

export default router;
