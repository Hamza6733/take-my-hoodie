// GET /api/product — public. Returns the saved product (or null → site uses js/config.js).
import { productStore, json } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const data = await productStore().get("current", { type: "json" });
  return json({ product: data || null }, 200, { "cache-control": "public, max-age=0, must-revalidate" });
};

export const config = { path: "/api/product" };
