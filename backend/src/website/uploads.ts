// Image uploads for website content (covers, avatars, hero background).
// Takes a base64 data URL like the rest of the CRM API and stores it on Cloudinary.
import { Router } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { cloudinary, cloudinaryEnabled } from "../lib/cloudinary.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { ApiError, asyncHandler, badRequest } from "../lib/http.js";

const router = Router();
router.use(requireAuth, requireRole("pm"));

const uploadSchema = z.object({
  name: z.string().max(200).optional(),
  dataUrl: z.string().min(10), // data:<mime>;base64,...
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!cloudinaryEnabled) throw new ApiError(503, "Uploads are not configured. Set CLOUDINARY_URL and restart the API.");
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("An image data URL is required");
    const b64 = parsed.data.dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.floor((b64.length * 3) / 4);
    if (approxBytes > env.uploadMaxBytes) {
      throw badRequest(`File exceeds the ${Math.round(env.uploadMaxBytes / 1048576)}MB limit`);
    }
    const uploaded = await cloudinary.uploader.upload(parsed.data.dataUrl, {
      folder: `${env.cloudinaryFolder}/website`,
      resource_type: "auto",
      quality: "auto",
    });
    res.status(201).json({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      format: uploaded.format ?? "",
      width: uploaded.width ?? 0,
      height: uploaded.height ?? 0,
      bytes: uploaded.bytes ?? approxBytes,
      resourceType: uploaded.resource_type,
    });
  }),
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const publicId = typeof req.body?.publicId === "string" ? req.body.publicId : "";
    if (!publicId) throw badRequest("publicId is required");
    if (cloudinaryEnabled) await cloudinary.uploader.destroy(publicId);
    res.status(204).end();
  }),
);

export default router;
