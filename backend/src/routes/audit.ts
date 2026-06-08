import { Router } from "express";
import { collections, cleanAll } from "../db.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/http.js";

const router = Router();
router.use(requireAuth, requireRole("pm", "accountant", "auditor"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.actor) filter.actor = req.query.actor;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const items = await collections.audit().find(filter).sort({ at: -1 }).limit(limit).toArray();
    res.json(cleanAll(items));
  }),
);

export default router;
