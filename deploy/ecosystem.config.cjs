// PM2 process definitions for Silifton CRM on the VPS.
//
// Two long-running processes, named so they don't collide with the
// portfolio's PM2 apps on the same server:
//   • silifton-crm-web  — Next frontend (crm.silifton.com    → :7010)
//   • silifton-crm-api  — Express API   (crmapi.silifton.com → :7011)
//
// Non-secret production config lives here. Secrets (MONGODB_URI, JWT_SECRET,
// CLOUDINARY_URL) stay in backend/.env which is git-ignored and created once
// on the server. dotenv does NOT override vars already set in the environment,
// so the values below win over any stale dev values in backend/.env.

const path = require("path");
const ROOT = path.resolve(__dirname, "..");

// Ports — override by exporting CRM_API_PORT / CRM_WEB_PORT before deploy.
// Base port is 7010 (frontend), 7011 (API) — sequential block reserved for the CRM.
const WEB_PORT = process.env.CRM_WEB_PORT || "7010";
const API_PORT = process.env.CRM_API_PORT || "7011";

module.exports = {
  apps: [
    {
      name: "silifton-crm-api",
      cwd: path.join(ROOT, "backend"),
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "350M",
      env: {
        NODE_ENV: "production",
        PORT: API_PORT,
        CORS_ORIGIN: "https://crm.silifton.com",
        COOKIE_NAME: "silifton_session",
        MONGODB_DB: "silifton",
        JWT_EXPIRES_IN: "7d",
        CLOUDINARY_FOLDER: "silifton",
      },
    },
    {
      name: "silifton-crm-web",
      cwd: path.join(ROOT, "frontend"),
      // Run the Next production server directly (avoids an npm wrapper process).
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${WEB_PORT}`,
      interpreter: "node",
      instances: 1,
      autorestart: true,
      max_memory_restart: "450M",
      env: {
        NODE_ENV: "production",
        PORT: WEB_PORT,
      },
    },
  ],
};
