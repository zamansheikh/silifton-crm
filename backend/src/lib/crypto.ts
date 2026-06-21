// AES-256-GCM encryption for the credentials vault. Secret values are stored as
// `v1:<iv>:<tag>:<ciphertext>` (all base64) so they're unreadable at rest even
// if the database leaks. The key is derived from env.credentialsKey.
import crypto from "node:crypto";
import { env } from "../env.js";

const KEY = crypto.createHash("sha256").update(env.credentialsKey).digest(); // 32 bytes
const PREFIX = "v1:";

export function encrypt(plain: string): string {
  if (plain == null || plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  if (!payload) return "";
  if (!payload.startsWith(PREFIX)) return payload; // tolerate plaintext / pre-encryption rows
  try {
    const [, ivB64, tagB64, dataB64] = payload.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or corrupt ciphertext — return empty rather than crash the API.
    return "";
  }
}
