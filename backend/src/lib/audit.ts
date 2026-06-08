import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { collections } from "../db.js";

const ENTITY: Record<string, string> = {
  invoices: "invoice",
  expenses: "expense",
  projects: "project",
  tasks: "task",
  team: "member",
  clients: "client",
  time: "time",
  accounting: "accounting",
  auth: "auth",
};

const VERB: Record<string, string> = { POST: "create", PATCH: "update", PUT: "update", DELETE: "delete" };

function describe(method: string, path: string): { entity: string; action: string; entityId?: string } {
  const segs = path.replace(/^\/api\//, "").split("/").filter(Boolean);
  const head = segs[0] ?? "";
  const entity = ENTITY[head] ?? head;

  // For namespaced areas the meaningful noun is the second segment.
  if (head === "accounting" || head === "auth") {
    const noun = segs[1] ?? head;
    return { entity, action: `${head}.${noun}`, entityId: segs[2] };
  }
  // Sub-resources like /tasks/:id/comments, /projects/:id/files
  if (segs.length >= 3) {
    return { entity, action: `${entity}.${segs[2]}.${VERB[method] ?? method.toLowerCase()}`, entityId: segs[1] };
  }
  return { entity, action: `${entity}.${VERB[method] ?? method.toLowerCase()}`, entityId: segs[1] };
}

// Append-only audit log of every successful mutating request.
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();

  // Capture now: Express rewrites req.path/req.url as it descends into routers,
  // so by the time `finish` fires it would be router-relative.
  const method = req.method;
  const path = req.originalUrl.split("?")[0];

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    const { entity, action, entityId } = describe(method, path);
    // actor is resolved at finish-time: requireAuth has populated req.user; auth
    // routes set res.locals.auditActor since they don't use requireAuth.
    const localActor = res.locals.auditActor as { id: string; name: string } | undefined;
    const actor = req.user ? { id: req.user.id, name: req.user.name } : localActor;

    const entry = {
      id: randomUUID(),
      at: new Date(),
      actor: actor?.id ?? "anonymous",
      actorName: actor?.name ?? "Anonymous",
      action,
      entity,
      entityId,
      method,
      path,
      status: res.statusCode,
      summary: `${actor?.name ?? "Someone"} · ${action}${entityId ? ` (${entityId})` : ""}`,
    };
    void collections.audit().insertOne(entry).catch(() => {});
  });

  next();
}
