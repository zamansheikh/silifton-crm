import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { collections, clean } from "../db.js";
import {
  verifyPassword,
  hashPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from "../lib/auth.js";
import { asyncHandler, badRequest, unauthorized } from "../lib/http.js";
import type { AuthUser, TeamMember } from "../types.js";

const router = Router();

// Throttle auth attempts to blunt credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts — try again in a few minutes." },
});

const GRADIENTS = [
  "linear-gradient(135deg, #a855f7, #f472b6)",
  "linear-gradient(135deg, #06b6d4, #14b8a6)",
  "linear-gradient(135deg, #ec4899, #f472b6)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #6366f1, #06b6d4)",
];

function toAuthUser(m: Omit<TeamMember, "_id">): AuthUser {
  return { id: m.id, name: m.name, email: m.email, appRole: m.appRole, role: m.role, bg: m.bg, title: m.title };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Email and password are required");
    const { email, password } = parsed.data;

    const member = await collections.team().findOne({ email: email.toLowerCase() });
    if (!member) throw unauthorized("Invalid email or password");
    const ok = await verifyPassword(password, member.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");

    const token = signToken({ id: member.id, appRole: member.appRole });
    setAuthCookie(res, token);
    res.locals.auditActor = { id: member.id, name: member.name };
    res.json({ user: toAuthUser(clean(member)), token });
  }),
);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Name, email and a 6+ char password are required");
    }
    const { name, email, password } = parsed.data;
    const lower = email.toLowerCase();
    if (await collections.team().findOne({ email: lower })) {
      throw badRequest("An account with that email already exists");
    }

    // Build a unique short id from initials.
    const base =
      name.split(" ").slice(0, 2).map((p) => p[0]?.toLowerCase()).join("") || "u";
    let id = base;
    let n = 1;
    while (await collections.team().findOne({ id })) id = `${base}${++n}`;

    const member: TeamMember = {
      id,
      name,
      email: lower,
      passwordHash: await hashPassword(password),
      role: "Dev",
      appRole: "dev",
      title: "Team member",
      bg: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
      mood: "Just joined",
      status: "idle",
      util: 0,
      hourly: 100,
      createdAt: new Date(),
    };
    await collections.team().insertOne(member);

    const token = signToken({ id: member.id, appRole: member.appRole });
    setAuthCookie(res, token);
    res.locals.auditActor = { id: member.id, name: member.name };
    res.status(201).json({ user: toAuthUser(clean(member)), token });
  }),
);

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changePwSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("New password must be at least 6 characters");
    const { currentPassword, newPassword } = parsed.data;
    const member = await collections.team().findOne({ id: req.user!.id });
    if (!member) throw unauthorized("Account no longer exists");
    const ok = await verifyPassword(currentPassword, member.passwordHash);
    if (!ok) throw badRequest("Current password is incorrect");
    await collections.team().updateOne(
      { id: member.id },
      { $set: { passwordHash: await hashPassword(newPassword) } },
    );
    res.json({ ok: true });
  }),
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

export default router;
