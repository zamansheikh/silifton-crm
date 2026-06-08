import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";
import { collections, clean } from "../db.js";
import { unauthorized, forbidden, asyncHandler } from "./http.js";
import type { AuthUser, AppRole } from "../types.js";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

interface TokenPayload {
  sub: string; // member id
  appRole: AppRole;
}

export function signToken(user: { id: string; appRole: AppRole }): string {
  const payload: TokenPayload = { sub: user.id, appRole: user.appRole };
  // @ts-expect-error jsonwebtoken's expiresIn accepts the string form ("7d")
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.cookieName, { path: "/" });
}

function readToken(req: Request): string | null {
  const cookieToken = req.cookies?.[env.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) throw unauthorized("Not signed in");
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    throw unauthorized("Invalid or expired session");
  }
  const member = await collections.team().findOne({ id: decoded.sub });
  if (!member) throw unauthorized("Account no longer exists");
  const { passwordHash, ...rest } = clean(member);
  void passwordHash;
  req.user = {
    id: rest.id,
    name: rest.name,
    email: rest.email,
    appRole: rest.appRole,
    role: rest.role,
    bg: rest.bg,
    title: rest.title,
  };

  // Auditors get read-only access everywhere (internal control). They may
  // still sign out and change their own password.
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const allowed = req.path.includes("change-password") || req.path.includes("logout");
  if (req.user.appRole === "auditor" && mutating && !allowed) {
    throw forbidden("Auditors have read-only access");
  }
  next();
});

// Roles with full administrative access.
export const ADMIN_ROLES: AppRole[] = ["founder", "director"];

// Require one of the given app roles (admins always pass).
export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (ADMIN_ROLES.includes(req.user.appRole) || roles.includes(req.user.appRole)) {
      return next();
    }
    return next(forbidden("Insufficient permissions"));
  };
}
