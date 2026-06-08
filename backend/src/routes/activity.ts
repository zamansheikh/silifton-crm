import { Router } from "express";
import { collections, cleanAll } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler } from "../lib/http.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = {};
    if (req.query.project) filter.project = req.query.project;
    const items = await collections.activity().find(filter).toArray();
    res.json(cleanAll(items));
  }),
);

export default router;
