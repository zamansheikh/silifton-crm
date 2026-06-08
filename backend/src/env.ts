import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  mongoUri: required("MONGODB_URI"),
  mongoDb: process.env.MONGODB_DB || "silifton",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  port: Number(process.env.PORT || 7011),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:7010")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cookieName: process.env.COOKIE_NAME || "silifton_session",
  isProd: process.env.NODE_ENV === "production",
  cloudinaryUrl: process.env.CLOUDINARY_URL || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "silifton",
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 10485760),
};
