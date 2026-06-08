import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import { cloudinary, cloudinaryEnabled } from "../lib/cloudinary.js";
import { env } from "../env.js";
import type { Project, ProjectFile } from "../types.js";

const router = Router();
router.use(requireAuth);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const projects = await collections.projects().find().toArray();
    res.json(cleanAll(projects));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await collections.projects().findOne({ id: req.params.id });
    if (!project) throw notFound("Project not found");
    res.json(clean(project));
  }),
);

const createSchema = z.object({
  name: z.string().min(2),
  client: z.string().min(1),
  code: z.string().min(2).max(4).optional(),
  accent: z.tuple([z.string(), z.string()]).optional(),
  deadline: z.string().optional(),
  start: z.string().optional(),
  budget: z.number().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  tags: z.array(z.string()).optional(),
  team: z.array(z.string()).optional(),
  lead: z.string().optional(),
});

router.post(
  "/",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid project");
    const b = parsed.data;
    const id = slugify(b.name) || `proj-${Date.now()}`;
    const exists = await collections.projects().findOne({ id });
    if (exists) throw badRequest("A project with a similar name already exists");

    const project: Project = {
      id,
      name: b.name,
      client: b.client,
      code: (b.code || b.name.slice(0, 3)).toUpperCase(),
      accent: b.accent ?? ["#a855f7", "#f472b6"],
      pct: 0,
      deadline: b.deadline ?? "TBD",
      start: b.start ?? "—",
      hours: 0,
      budget: b.budget ?? 0,
      status: { label: "On track", color: "var(--success)" },
      tasksOpen: 0,
      tasksDone: 0,
      team: b.team ?? (b.lead ? [b.lead] : []),
      lead: b.lead ?? (req.user?.id as string),
      priority: b.priority ?? "Medium",
      tags: b.tags ?? [],
      health: 80,
    };
    await collections.projects().insertOne(project);
    res.status(201).json(project);
  }),
);

const updateSchema = createSchema.partial().extend({
  pct: z.number().min(0).max(100).optional(),
  hours: z.number().optional(),
  health: z.number().optional(),
  pinned: z.boolean().optional(),
  status: z.object({ label: z.string(), color: z.string() }).optional(),
});

router.patch(
  "/:id",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid update");
    const update = { ...parsed.data };
    if (update.code) update.code = update.code.toUpperCase();
    const result = await collections.projects().findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Project not found");
    res.json(clean(result));
  }),
);

router.delete(
  "/:id",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const result = await collections.projects().deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) throw notFound("Project not found");
    await collections.tasks().deleteMany({ project: req.params.id });
    await collections.files().deleteMany({ project: req.params.id });
    res.json({ ok: true });
  }),
);

// Pin / unpin — lightweight, any authenticated user.
router.patch(
  "/:id/pin",
  asyncHandler(async (req, res) => {
    const pinned = Boolean(req.body?.pinned);
    const result = await collections.projects().findOneAndUpdate(
      { id: req.params.id },
      { $set: { pinned } },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Project not found");
    res.json(clean(result));
  }),
);

// ── Files (Cloudinary) ──────────────────────────────────────────────
router.get(
  "/:id/files",
  asyncHandler(async (req, res) => {
    const files = await collections.files().find({ project: req.params.id }).sort({ createdAt: -1 }).toArray();
    res.json(cleanAll(files));
  }),
);

const fileSchema = z.object({
  name: z.string().min(1),
  dataUrl: z.string().min(10), // data:<mime>;base64,...
});

router.post(
  "/:id/files",
  asyncHandler(async (req, res) => {
    if (!cloudinaryEnabled) throw badRequest("File uploads are not configured");
    const parsed = fileSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("A file name and data are required");
    const project = await collections.projects().findOne({ id: req.params.id });
    if (!project) throw notFound("Project not found");

    // Estimate decoded size from the base64 payload before uploading.
    const b64 = parsed.data.dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.floor((b64.length * 3) / 4);
    if (approxBytes > env.uploadMaxBytes) {
      throw badRequest(`File exceeds the ${Math.round(env.uploadMaxBytes / 1048576)}MB limit`);
    }

    const uploaded = await cloudinary.uploader.upload(parsed.data.dataUrl, {
      folder: `${env.cloudinaryFolder}/${project.id}`,
      resource_type: "auto",
    });

    const file: ProjectFile = {
      id: randomUUID(),
      project: project.id,
      name: parsed.data.name,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type,
      bytes: uploaded.bytes,
      format: uploaded.format ?? "",
      uploadedBy: req.user!.id,
      createdAt: new Date(),
    };
    await collections.files().insertOne(file);
    res.status(201).json(clean(file));
  }),
);

router.delete(
  "/:id/files/:fileId",
  asyncHandler(async (req, res) => {
    const file = await collections.files().findOne({ id: req.params.fileId });
    if (!file) throw notFound("File not found");
    if (cloudinaryEnabled) {
      await cloudinary.uploader
        .destroy(file.publicId, { resource_type: file.resourceType })
        .catch(() => {});
    }
    await collections.files().deleteOne({ id: req.params.fileId });
    res.json({ ok: true });
  }),
);

export default router;
