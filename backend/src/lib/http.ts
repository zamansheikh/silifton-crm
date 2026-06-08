import type { Request, Response, NextFunction, RequestHandler } from "express";

// Thrown anywhere in a handler to produce a clean JSON error response.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m = "Bad request") => new ApiError(400, m);
export const unauthorized = (m = "Unauthorized") => new ApiError(401, m);
export const forbidden = (m = "Forbidden") => new ApiError(403, m);
export const notFound = (m = "Not found") => new ApiError(404, m);

// Wrap an async handler so rejections flow to the error middleware.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Mongo duplicate key
  if (typeof err === "object" && err && "code" in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ error: "Duplicate key" });
  }
  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error" });
}
