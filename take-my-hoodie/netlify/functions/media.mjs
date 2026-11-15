// GET /api/media/:key — serves uploaded product photos.
import { mediaStore } from "../lib/shared.mjs";

export default async (req, context) => {
  const key = (context && context.params && context.params.key) || decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "");
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(key || "")) return new Response("Not found", { status: 404 });
  const entry = await mediaStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(entry.data, {
    headers: {
      "content-type": (entry.metadata && entry.metadata.contentType) || "image/jpeg",
      // keys are unique per upload, so they can be cached forever
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/media/:key" };
