// Shared helpers for the admin API (auth, storage, validation).
import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const productStore = () => getStore({ name: "tmh-product", consistency: "strong" });
export const mediaStore = () => getStore({ name: "tmh-media", consistency: "strong" });
export const authStore = () => getStore({ name: "tmh-auth", consistency: "strong" });

export const IMAGE_SLOTS = ["hero", "back", "detail", "worn"];
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // images are compressed in the browser first
const SESSION_HOURS = 12;

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

/* ---------------- auth ---------------- */
const password = () => process.env.ADMIN_PASSWORD || "";
const secret = () => (process.env.ADMIN_SESSION_SECRET || "") + "|" + password();
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

export function passwordConfigured() {
  return password().length >= 10;
}

export function checkPassword(given) {
  const a = createHmac("sha256", "cmp").update(String(given || "")).digest();
  const b = createHmac("sha256", "cmp").update(password()).digest();
  return passwordConfigured() && timingSafeEqual(a, b);
}

export function makeToken() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3 }));
  return payload + "." + sign(payload);
}

export function verifyToken(req) {
  if (!passwordConfigured()) return false;
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export const unauthorized = () => json({ error: "Not logged in or session expired." }, 401);

/* ---------------- validation ---------------- */
const str = (v, max, fallback = "") => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const num = (v, min, max, fallback) => {
  if (v === "" || v === null || v === undefined || typeof v === "boolean") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const isHex = (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + "T00:00:00Z"));
const handle = (v) => str(v, 40).replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
const imageUrl = (v) =>
  typeof v === "string" && (/^\/api\/media\/[a-z0-9-]+\.(jpg|png|webp)$/.test(v) || /^images\/[a-z0-9-]+\.(jpg|png|webp)$/.test(v)) ? v : "";

export function sanitizeProduct(p) {
  if (!p || typeof p !== "object") throw new Error("Invalid product data.");
  const errors = [];

  const out = {
    productName: str(p.productName, 80) || "TAKE MY HOODIE — Drop 01",
    tagline: str(p.tagline, 120),
    status: ["open", "closed", "soldout"].includes(p.status) ? p.status : "open",
    price: Math.round(num(p.price, 1, 10000, NaN) * 100) / 100,
    shippingFlat: Math.round(num(p.shippingFlat, 0, 1000, 0) * 100) / 100,
    maxQty: Math.round(num(p.maxQty, 1, 50, 5)),
    dropSize: Math.round(num(p.dropSize, 1, 1000000, NaN)),
    presaleEnd: str(p.presaleEnd, 40),
    productionStartDate: str(p.productionStartDate, 10),
    shipDateDate: str(p.shipDateDate, 10),
    paypalClientId: str(p.paypalClientId, 200).replace(/[^A-Za-z0-9_-]/g, ""),
    email: str(p.email, 120),
    instagram: handle(p.instagram),
    tiktok: handle(p.tiktok),
  };

  if (!Number.isFinite(out.price) || Number(p.price) < 1) errors.push("Price is required (at least $1).");
  if (!Number.isFinite(out.dropSize)) errors.push("Drop size is required.");
  if (isNaN(Date.parse(out.presaleEnd))) errors.push("Presale end date is invalid.");
  else out.presaleEnd = new Date(out.presaleEnd).toISOString();
  if (!isDate(out.productionStartDate)) errors.push("Production start date is invalid.");
  if (!isDate(out.shipDateDate)) errors.push("Ship date is invalid.");
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) errors.push("Contact email looks wrong.");

  // Human-readable dates used across the site ("March 15, 2027")
  const label = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (isDate(out.productionStartDate)) out.productionStart = label(out.productionStartDate);
  if (isDate(out.shipDateDate)) out.shipDate = label(out.shipDateDate);

  out.colors = (Array.isArray(p.colors) ? p.colors : []).slice(0, 8).map((c) => ({
    id: (str(c && c.name, 40).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "color"),
    name: str(c && c.name, 40),
    hex: isHex(c && c.hex) ? c.hex : "#141414",
  })).filter((c) => c.name);
  // make ids unique
  const seen = {};
  out.colors.forEach((c) => { seen[c.id] = (seen[c.id] || 0) + 1; if (seen[c.id] > 1) c.id += "-" + seen[c.id]; });
  if (!out.colors.length) errors.push("Add at least one color.");

  out.sizes = [];
  out.sizeChart = {};
  (Array.isArray(p.sizeRows) ? p.sizeRows : []).slice(0, 10).forEach((r) => {
    const size = str(r && r.size, 6).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!size || out.sizes.includes(size)) return;
    out.sizes.push(size);
    out.sizeChart[size] = {
      chest: num(r.chest, 0, 300, 0),
      length: num(r.length, 0, 300, 0),
      sleeve: num(r.sleeve, 0, 300, 0),
    };
  });
  if (!out.sizes.length) errors.push("Add at least one size.");

  out.specs = (Array.isArray(p.specs) ? p.specs : []).slice(0, 3).map((s) => ({
    label: str(s && s.label, 40),
    value: str(s && s.value, 60),
    text: str(s && s.text, 400),
  }));

  out.images = {};
  const imgs = p.images && typeof p.images === "object" ? p.images : {};
  IMAGE_SLOTS.forEach((slot) => { out.images[slot] = imageUrl(imgs[slot]) || `images/${slot}.jpg`; });

  if (errors.length) {
    const e = new Error(errors.join(" "));
    e.validation = true;
    throw e;
  }
  return out;
}
