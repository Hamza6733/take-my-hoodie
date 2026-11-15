// POST /api/admin/upload?slot=hero  (body = image bytes) → { url }
import { IMAGE_SLOTS, MAX_UPLOAD_BYTES, json, mediaStore, unauthorized, verifyToken } from "../lib/shared.mjs";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!verifyToken(req)) return unauthorized();

  const slot = new URL(req.url).searchParams.get("slot");
  if (!IMAGE_SLOTS.includes(slot)) return json({ error: "Unknown image slot." }, 400);

  const type = (req.headers.get("content-type") || "").split(";")[0].trim();
  const ext = TYPES[type];
  if (!ext) return json({ error: "Upload a JPG, PNG or WebP image." }, 415);

  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: "Empty file." }, 400);
  if (buf.byteLength > MAX_UPLOAD_BYTES) return json({ error: "Image is too large (max 4 MB after compression)." }, 413);

  const key = `${slot}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await mediaStore().set(key, buf, { metadata: { contentType: type, slot, uploadedAt: new Date().toISOString() } });
  return json({ url: `/api/media/${key}` });
};

export const config = { path: "/api/admin/upload" };
