// Public, unauthenticated endpoints — token-gated read-only audit access for
// external reviewers (RJSC / auditors) who don't have an account.
import { Router } from "express";
import { collections } from "../db.js";
import { asyncHandler, notFound, ApiError } from "../lib/http.js";
import { buildAuditPack } from "../lib/auditpack.js";

const router = Router();

router.get(
  "/audit/:token",
  asyncHandler(async (req, res) => {
    const share = await collections.shares().findOne({ token: req.params.token });
    if (!share) throw notFound("This audit link is invalid");
    if (new Date(share.expiresAt) < new Date()) throw new ApiError(410, "This audit link has expired");

    const pack = await buildAuditPack(share.period);
    res.json({
      share: {
        label: share.label,
        period: share.period,
        expiresAt: share.expiresAt,
        sharedBy: share.createdByName,
      },
      ...pack,
    });
  }),
);

export default router;
