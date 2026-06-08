import { Router } from "express";
import { z } from "zod";
import { collections, cleanAll, clean } from "../db.js";
import { requireAuth, requireRole, hashPassword, ADMIN_ROLES } from "../lib/auth.js";
import { asyncHandler, badRequest, notFound } from "../lib/http.js";
import type { TeamMember, PublicMember } from "../types.js";

const router = Router();
router.use(requireAuth);

const strip = (m: TeamMember): PublicMember => {
  const { passwordHash, ...rest } = clean(m);
  void passwordHash;
  return rest as PublicMember;
};

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const members = await collections.team().find().toArray();
    res.json(members.map(strip));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const member = await collections.team().findOne({ id: req.params.id });
    if (!member) throw notFound("Member not found");
    res.json(strip(member));
  }),
);

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["Founder", "PM", "Dev", "Design", "QA", "Ops"]),
  appRole: z.enum(["founder", "director", "pm", "accountant", "auditor", "dev"]).optional(),
  title: z.string().optional(),
  hourly: z.number().optional(),
  bg: z.string().optional(),
  password: z.string().min(4).optional(),
});

router.post(
  "/",
  requireRole("pm"),
  asyncHandler(async (req, res) => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid member");
    const b = parsed.data;
    const id = b.name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toLowerCase())
      .join("");
    if (await collections.team().findOne({ $or: [{ id }, { email: b.email.toLowerCase() }] })) {
      throw badRequest("A member with that id or email already exists");
    }
    const member: TeamMember = {
      id,
      name: b.name,
      email: b.email.toLowerCase(),
      passwordHash: await hashPassword(b.password ?? "silifton"),
      role: b.role,
      appRole: b.appRole ?? (b.role === "Founder" ? "founder" : b.role === "PM" ? "pm" : "dev"),
      title: b.title ?? b.role,
      bg: b.bg ?? "linear-gradient(135deg, #a855f7, #f472b6)",
      mood: "Just joined",
      status: "idle",
      util: 0,
      hourly: b.hourly ?? 100,
      createdAt: new Date(),
    };
    await collections.team().insertOne(member);
    res.status(201).json(strip(member));
  }),
);

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  title: z.string().optional(),
  mood: z.string().optional(),
  status: z.enum(["tracking", "idle", "meeting", "offline"]).optional(),
  util: z.number().min(0).max(100).optional(),
  hourly: z.number().optional(),
  role: z.enum(["Founder", "PM", "Dev", "Design", "QA", "Ops"]).optional(),
  appRole: z.enum(["founder", "director", "pm", "accountant", "auditor", "dev"]).optional(),
});

// Fields a member may change on their own profile.
const SELF_FIELDS = new Set(["name", "title", "mood", "status"]);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const isSelf = req.user?.id === req.params.id;
    const isManager = !!req.user && (ADMIN_ROLES.includes(req.user.appRole) || req.user.appRole === "pm");
    if (!isSelf && !isManager) throw badRequest("Cannot edit another member");
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Invalid update");

    const memberId = String(req.params.id);
    const update: Record<string, unknown> = { ...parsed.data };
    if (typeof update.email === "string") {
      const email = update.email.toLowerCase();
      update.email = email;
      const clash = await collections.team().findOne({ email, id: { $ne: memberId } });
      if (clash) throw badRequest("Another member already uses that email");
    }
    if (!isManager) {
      // Strip anything a non-manager may not set on their own profile.
      for (const k of Object.keys(update)) if (!SELF_FIELDS.has(k)) delete update[k];
    }

    const result = await collections.team().findOneAndUpdate(
      { id: memberId },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!result) throw notFound("Member not found");
    res.json(strip(result));
  }),
);

router.delete(
  "/:id",
  requireRole("founder"),
  asyncHandler(async (req, res) => {
    const memberId = String(req.params.id);
    if (req.user?.id === memberId) throw badRequest("You can't remove your own account");
    const result = await collections.team().deleteOne({ id: memberId });
    if (result.deletedCount === 0) throw notFound("Member not found");
    // Detach from projects so the UI stays consistent.
    await collections.projects().updateMany(
      { team: memberId },
      { $pull: { team: memberId } },
    );
    res.json({ ok: true });
  }),
);

export default router;
