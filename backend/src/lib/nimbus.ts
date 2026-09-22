// Nimbus — cloud file-storage REST API client.
//
// Base URL and API key come from the environment (NIMBUS_BASE_URL, NIMBUS_API_KEY);
// nothing is hard-coded. Every call sends `Authorization: Bearer <key>`, and any
// non-2xx response is surfaced as a NimbusError carrying the API's code/message.
//
// Usage:
//   import { nimbus } from "./lib/nimbus.js";
//   const { url, asset } = await nimbus.upload({ data: buffer, filename: "cover.jpg", mimeType: "image/jpeg" }, { tags: ["website"] });
//   await nimbus.remove(asset._id);              // or nimbus.removeByUrl(url)
//   const page = await nimbus.list({ kind: "image", sort: "newest", limit: 24 });
import { env } from "../env.js";

export type NimbusKind = "image" | "video" | "audio" | "document" | "archive" | "other";

export interface NimbusAsset {
  _id: string;
  filename: string;
  key: string;
  mimeType: string;
  kind: NimbusKind;
  size: number;
  /** Permanent public URL (preferred). null for private files. */
  url: string | null;
  /** Temporary signed URL (≈1h), present only when `url` is null. */
  downloadUrl?: string;
  tags: string[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NimbusUploadInput {
  data: Buffer | Uint8Array | Blob;
  filename: string;
  mimeType?: string;
}

export interface NimbusUploadOptions {
  tags?: string[];
  folderId?: string;
  providerId?: string;
  /** Overrides the instance's auto-compress setting for JPEG/PNG/GIF. */
  optimize?: boolean;
}

export interface NimbusListParams {
  search?: string;
  kind?: NimbusKind;
  sort?: "newest" | "oldest" | "largest" | "name";
  page?: number;
  limit?: number;
  format?: string;
  optimized?: boolean;
  minSize?: number;
  sinceDays?: number;
}

export interface NimbusPage {
  items: NimbusAsset[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface NimbusOptimizeResult {
  results: unknown[];
  optimized: number;
  skipped: number;
  errors: number;
  savedBytes: number;
}

export class NimbusError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const nimbusEnabled = Boolean(env.nimbusApiKey);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!nimbusEnabled) throw new NimbusError(503, "not_configured", "Nimbus is not configured (NIMBUS_API_KEY missing)");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.nimbusApiKey}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${env.nimbusBaseUrl}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string }; code?: string } | null) ?? {};
    const code = err.error?.code ?? err.code ?? `http_${res.status}`;
    const message = err.error?.message ?? (code === "provider_upload_failed" ? "The storage provider rejected the write — check the provider's credentials" : `Nimbus request failed (${res.status})`);
    throw new NimbusError(res.status, code, message);
  }
  return body as T;
}

const qs = (params: object) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
};

/** Public URL for an asset, falling back to the temporary signed link. */
export function nimbusUrl(asset: NimbusAsset): string {
  return asset.url ?? asset.downloadUrl ?? "";
}

export const nimbus = {
  enabled: nimbusEnabled,

  async upload(file: NimbusUploadInput, opts: NimbusUploadOptions = {}): Promise<{ asset: NimbusAsset; url: string }> {
    const fd = new FormData();
    const blob = file.data instanceof Blob ? file.data : new Blob([file.data as Uint8Array], { type: file.mimeType ?? "application/octet-stream" });
    fd.append("file", blob, file.filename);
    if (opts.tags?.length) fd.append("tags", opts.tags.join(","));
    if (opts.folderId) fd.append("folderId", opts.folderId);
    if (opts.providerId) fd.append("providerId", opts.providerId);
    if (opts.optimize !== undefined) fd.append("optimize", opts.optimize ? "true" : "false");
    const out = await request<{ uploaded: NimbusAsset[]; count: number; note?: string }>("/assets/upload", { method: "POST", body: fd });
    const asset = out.uploaded?.[0];
    if (!asset) throw new NimbusError(502, "empty_response", "Nimbus returned no uploaded asset");
    return { asset, url: nimbusUrl(asset) };
  },

  list(params: NimbusListParams = {}): Promise<NimbusPage> {
    return request<NimbusPage>(`/assets${qs(params)}`);
  },

  get(id: string): Promise<NimbusAsset> {
    return request<NimbusAsset>(`/assets/${encodeURIComponent(id)}`);
  },

  /** Fresh signed URL — use for private files whose `url` is null. */
  async freshUrl(id: string): Promise<string> {
    const r = await request<{ url: string }>(`/assets/${encodeURIComponent(id)}/download-url`);
    return r.url;
  },

  update(id: string, patch: { filename?: string; tags?: string[] }): Promise<NimbusAsset> {
    return request<NimbusAsset>(`/assets/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async remove(id: string): Promise<boolean> {
    const r = await request<{ deleted: boolean }>(`/assets/${encodeURIComponent(id)}`, { method: "DELETE" });
    return Boolean(r?.deleted);
  },

  getByUrl(url: string): Promise<NimbusAsset> {
    return request<NimbusAsset>(`/assets/by-url${qs({ url })}`);
  },

  async removeByUrl(url: string): Promise<boolean> {
    const r = await request<{ deleted: boolean }>(`/assets/by-url${qs({ url })}`, { method: "DELETE" });
    return Boolean(r?.deleted);
  },

  optimize(ids: string[], quality?: number): Promise<NimbusOptimizeResult> {
    return request<NimbusOptimizeResult>("/assets/optimize", { method: "POST", body: JSON.stringify(quality ? { ids, quality } : { ids }) });
  },
};
