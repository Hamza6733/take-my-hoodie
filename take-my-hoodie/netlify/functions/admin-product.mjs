// PUT /api/admin/product  (product JSON) → { product }
// Saves the product and deletes photos that are no longer used.
import { json, mediaStore, productStore, sanitizeProduct, unauthorized, verifyToken } from "../lib/shared.mjs";

export default async (req) => {
  if (!verifyToken(req)) return unauthorized();
  if (req.method === "GET") {
    return json({ ok: true }); // used by the admin page to check the session
  }
  if (req.method !== "PUT") return json({ error: "Method not allowed" }, 405);

  let input;
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON." }, 400); }

  let product;
  try {
    product = sanitizeProduct(input);
  } catch (e) {
    return json({ error: e.message || "Invalid data." }, 400);
  }
  product.updatedAt = new Date().toISOString();
  await productStore().setJSON("current", product);

  // Clean up unused uploads (keep anything uploaded in the last hour, in case another tab is mid-edit)
  try {
    const used = new Set(Object.values(product.images).map((u) => u.split("/").pop()));
    const store = mediaStore();
    const { blobs } = await store.list();
    const hourAgo = Date.now() - 3600e3;
    await Promise.all(blobs.filter((b) => !used.has(b.key)).map(async (b) => {
      const meta = await store.getMetadata(b.key);
      const at = meta && meta.metadata && Date.parse(meta.metadata.uploadedAt);
      if (!at || at < hourAgo) await store.delete(b.key);
    }));
  } catch (e) {
    console.error("cleanup failed", e);
  }

  return json({ product });
};

export const config = { path: "/api/admin/product" };
