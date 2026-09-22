import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { connect, ensureIndexes } from "./db.js";
import { errorHandler } from "./lib/http.js";

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import timeRoutes from "./routes/time.js";
import clientRoutes from "./routes/clients.js";
import teamRoutes from "./routes/team.js";
import invoiceRoutes from "./routes/invoices.js";
import expenseRoutes from "./routes/expenses.js";
import accountingRoutes from "./routes/accounting.js";
import assetRoutes from "./routes/assets.js";
import auditRoutes from "./routes/audit.js";
import publicRoutes from "./routes/public.js";
import dashboardRoutes from "./routes/dashboard.js";
import activityRoutes from "./routes/activity.js";
import credentialRoutes from "./routes/credentials.js";
import { auditMiddleware } from "./lib/audit.js";
import { requireAuth } from "./lib/auth.js";
import { ensureWebsiteIndexes, seedWebsiteIfEmpty } from "./website/db.js";
import websiteContentRoutes from "./website/content.js";
import websiteInquiryRoutes from "./website/inquiries.js";
import websiteApplicationRoutes from "./website/applications.js";
import websiteAnalyticsRoutes from "./website/analytics.js";
import { publicRouter as websiteSettingsPublic, adminRouter as websiteSettingsAdmin } from "./website/settings.js";
import websiteUploadRoutes from "./website/uploads.js";

async function main() {
  await connect();
  await ensureIndexes();
  await ensureWebsiteIndexes();
  await seedWebsiteIfEmpty();

  const app = express();
  // Behind nginx in production: trust the first proxy hop so req.ip and
  // express-rate-limit read the real client IP from X-Forwarded-For.
  if (env.isProd) app.set("trust proxy", 1);
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "15mb" })); // headroom for base64 file uploads
  app.use(cookieParser());
  app.use(auditMiddleware); // append-only audit log of mutations

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "silifton-api", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/time", timeRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/accounting", accountingRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/credentials", credentialRoutes);

  // Public website (silifton.com). Same paths the site's old NestJS API served,
  // so the marketing site only needed its API base URL changed.
  app.use("/api/content", websiteContentRoutes);
  app.use("/api/admin/content", requireAuth, websiteContentRoutes);
  app.use("/api/inquiries", websiteInquiryRoutes);
  app.use("/api/applications", websiteApplicationRoutes);
  app.use("/api/analytics", websiteAnalyticsRoutes);
  app.use("/api/settings", websiteSettingsPublic);
  app.use("/api/admin/settings", websiteSettingsAdmin);
  app.use("/api/admin/uploads", websiteUploadRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`✓ Silifton API on http://localhost:${env.port}`);
    console.log(`  CORS origins: ${env.corsOrigins.join(", ")}`);
  });
}

main().catch((err) => {
  console.error("✗ Failed to start server:", err);
  process.exit(1);
});
