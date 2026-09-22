// Image uploads for website content (covers, avatars, hero background).
// Takes a base64 data URL like the rest of the CRM API. Files go to Nimbus when
// NIMBUS_API_KEY is configured, otherwise to Cloudinary. The returned publicId is
// prefixed with the provider ("nimbus:<id>" / "cloudinary:<public_id>") so a later
// delete knows where to look.
import { Router } from "express";
import { z } from "zod";
import { env } from "../env.js";
import { cloudinary, cloudinaryEnabled } from "../lib/cloudinary.js";
import { nimbus, NimbusError } from "../lib/nimbus.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { ApiError, asyncHandler, badRequest } from "../lib/http.js";

const router = Router();
router.use(requireAuth, requireRole("pm"));

const uploadSchema = z.object({
  name: z.string().max(200).optional(),
  dataUrl: z.string().min(10), // data:<mime>;base64,...
});

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = dataUrl.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/s);
  if (!m) throw badRequest("Expected a base64 data URL");
  return { mime: m[1] || "application/octet-stream", buffer: Buffer.from(m[2], "base64") };
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "image/avif": "avif" };

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("An image data URL is required");
    const { mime, buffer } = parseDataUrl(parsed.data.dataUrl);
    if (buffer.length > env.uploadMaxBytes) {
      throw badRequest(`File exceeds the ${Math.round(env.uploadMaxBytes / 1048576)}MB limit`);
    }

    if (nimbus.enabled) {
      const safeName = (parsed.data.name || "upload").replace(/[^\w.\-]+/g, "-").slice(0, 120);
      const filename = /\.[a-z0-9]{2,5}$/i.test(safeName) ? safeName : `${safeName}.${EXT[mime] ?? "bin"}`;
      try {
        const { asset, url } = await nimbus.upload(
          { data: buffer, filename, mimeType: mime },
          { tags: ["website", "silifton"], ...(env.nimbusFolderId ? { folderId: env.nimbusFolderId } : {}) },
        );
        return res.status(201).json({
          url,
          publicId: `nimbus:${asset._id}`,
          provider: "nimbus",
          format: asset.mimeType?.split("/")[1] ?? EXT[mime] ?? "",
          width: 0,
          height: 0,
          bytes: asset.size ?? buffer.length,
          resourceType: asset.kind ?? "image",
        });
      } catch (e) {
        if (e instanceof NimbusError) throw new ApiError(e.status >= 500 ? 502 : e.status, `Upload failed: ${e.message}`);
        throw e;
      }
    }

    if (!cloudinaryEnabled) throw new ApiError(503, "Uploads are not configured. Set NIMBUS_API_KEY (or CLOUDINARY_URL) and restart the API.");
    const uploaded = await cloudinary.uploader.upload(parsed.data.dataUrl, {
      folder: `${env.cloudinaryFolder}/website`,
      resource_type: "auto",
      quality: "auto",
    });
    res.status(201).json({
      url: uploaded.secure_url,
      publicId: `cloudinary:${uploaded.public_id}`,
      provider: "cloudinary",
      format: uploaded.format ?? "",
      width: uploaded.width ?? 0,
      height: uploaded.height ?? 0,
      bytes: uploaded.bytes ?? buffer.length,
      resourceType: uploaded.resource_type,
    });
  }),
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const publicId = typeof req.body?.publicId === "string" ? req.body.publicId : "";
    if (!publicId) throw badRequest("publicId is required");
    if (publicId.startsWith("nimbus:")) {
      if (nimbus.enabled) await nimbus.remove(publicId.slice("nimbus:".length)).catch(() => {});
    } else {
      const id = publicId.replace(/^cloudinary:/, "");
      if (cloudinaryEnabled) await cloudinary.uploader.destroy(id).catch(() => {});
    }
    res.status(204).end();
  }),
);

export default router;
