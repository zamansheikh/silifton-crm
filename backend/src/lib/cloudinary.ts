import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";

// The SDK reads CLOUDINARY_URL from the environment automatically; this just
// flips on HTTPS URLs and lets the rest of the app check availability.
export const cloudinaryEnabled = Boolean(env.cloudinaryUrl);
if (cloudinaryEnabled) {
  cloudinary.config({ secure: true });
}

export { cloudinary };
