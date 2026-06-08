import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound, forbidden } from "../lib/http.js";
import type { Task, TaskStatus, Subtask, TaskComment } from "../types.js";

const router = Router();
router.use(requireAuth);

const STATUSES: TaskStatus[] = ["backlog", "todo", "doing", "review", "done"];

// Recompute open/done counts + % on the parent project after a task change.
async function recomputeProject(projectId: string) {
  const tasks = await collections.tasks().find({ project: projectId }).toArray();
  if (tasks.length === 0) {
    await collections.projects().updateOne(
      { id: projectId },
      { $set: { tasksOpen: 0, tasksDone: 0 } },
    );
    return;
  }
  const done = tasks.filter((t) => t.status === "done").length;
  const open = tasks.length - done;
  await collections.projects().updateOne(
    { id: projectId },
    { $set: { tasksOpen: open, tasksDone: done } },
  );
}

async function nextTaskId(): Promise<string> {
  const tasks = await collections.tasks().find({}, { projection: { id: 1 } }).toArray();
  let max = 0;
  for (const t of tasks) {
    const n = Number(String(t.id).replace(/\D/g, ""));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `TSK-${max + 1}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignee) filter.assignees = req.query.assignee;
    const tasks = await collections.tasks().find(filter).sort({ order: 1 }).toArray();
    res.json(cleanAll(tasks));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    res.json(clean(task));
  }),
);

const createSchema = z.object({
  title: z.string().min(2),
  project: z.string().min(1),
  status: z.enum(["backlog", "todo", "doing", "review", "done"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  assignees: z.array(z.string()).optional(),
  est: z.number().optional(),
  due: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.number().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid task");
    const b = parsed.data;
    const project = await collections.projects().findOne({ id: b.project });
    if (!project) throw badRequest("Unknown project");

    const id = await nextTaskId();
    const count = await collections.tasks().countDocuments();
    const task: Task = {
      id,
      title: b.title,
      project: b.project,
      status: b.status ?? "backlog",
      priority: b.priority ?? "Medium",
      assignees: b.assignees ?? (req.user ? [req.user.id] : []),
      est: b.est ?? 0,
      spent: 0,
      due: b.due ?? "—",
      tags: b.tags ?? [],
      subtasks: b.subtasks ?? 0,
      done: 0,
      comments: 0,
      order: count,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.tasks().insertOne(task);
    await recomputeProject(b.project);
    res.status(201).json(task);
  }),
);

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  status: z.enum(["backlog", "todo", "doing", "review", "done"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  assignees: z.array(z.string()).optional(),
  est: z.number().optional(),
  spent: z.number().optional(),
  due: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.number().optional(),
  done: z.number().optional(),
  order: z.number().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid update");
    if (parsed.data.status && !STATUSES.includes(parsed.data.status)) {
      throw badRequest("Invalid status");
    }
    const result = await collections.tasks().findOneAndUpdate(
      { id: req.params.id },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Task not found");
    await recomputeProject(result.project);
    res.json(clean(result));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    await collections.tasks().deleteOne({ id: req.params.id });
    await collections.comments().deleteMany({ task: req.params.id });
    await recomputeProject(task.project);
    res.json({ ok: true });
  }),
);

// ── Subtasks (checklist embedded on the task) ───────────────────────
async function saveChecklist(taskId: string, checklist: Subtask[]) {
  await collections.tasks().updateOne(
    { id: taskId },
    {
      $set: {
        checklist,
        subtasks: checklist.length,
        done: checklist.filter((s) => s.done).length,
        updatedAt: new Date(),
      },
    },
  );
}

router.post(
  "/:id/subtasks",
  asyncHandler(async (req, res) => {
    const title = String(req.body?.title ?? "").trim();
    if (!title) throw badRequest("Subtask title is required");
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    const checklist = [...(task.checklist ?? []), { id: randomUUID(), title, done: false }];
    await saveChecklist(task.id, checklist);
    const updated = await collections.tasks().findOne({ id: task.id });
    res.status(201).json(clean(updated!));
  }),
);

const subtaskPatch = z.object({ done: z.boolean().optional(), title: z.string().min(1).optional() });

router.patch(
  "/:id/subtasks/:sid",
  asyncHandler(async (req, res) => {
    const parsed = subtaskPatch.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid subtask update");
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    const checklist = (task.checklist ?? []).map((s) =>
      s.id === req.params.sid ? { ...s, ...parsed.data } : s,
    );
    await saveChecklist(task.id, checklist);
    const updated = await collections.tasks().findOne({ id: task.id });
    res.json(clean(updated!));
  }),
);

router.delete(
  "/:id/subtasks/:sid",
  asyncHandler(async (req, res) => {
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    const checklist = (task.checklist ?? []).filter((s) => s.id !== req.params.sid);
    await saveChecklist(task.id, checklist);
    const updated = await collections.tasks().findOne({ id: task.id });
    res.json(clean(updated!));
  }),
);

// ── Comments ────────────────────────────────────────────────────────
async function syncCommentCount(taskId: string) {
  const count = await collections.comments().countDocuments({ task: taskId });
  await collections.tasks().updateOne({ id: taskId }, { $set: { comments: count } });
}

router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const comments = await collections
      .comments()
      .find({ task: req.params.id })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(cleanAll(comments));
  }),
);

router.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const body = String(req.body?.body ?? "").trim();
    if (!body) throw badRequest("Comment body is required");
    const task = await collections.tasks().findOne({ id: req.params.id });
    if (!task) throw notFound("Task not found");
    const comment: TaskComment = {
      id: randomUUID(),
      task: task.id,
      author: req.user!.id,
      body,
      createdAt: new Date(),
    };
    await collections.comments().insertOne(comment);
    await syncCommentCount(task.id);
    res.status(201).json(clean(comment));
  }),
);

router.delete(
  "/:id/comments/:cid",
  asyncHandler(async (req, res) => {
    const comment = await collections.comments().findOne({ id: req.params.cid });
    if (!comment) throw notFound("Comment not found");
    if (comment.author !== req.user!.id && req.user!.appRole !== "founder") {
      throw forbidden("You can only delete your own comments");
    }
    await collections.comments().deleteOne({ id: req.params.cid });
    await syncCommentCount(String(req.params.id));
    res.json({ ok: true });
  }),
);

export default router;
