// POST /api/admin/login  { password } → { token }
import { authStore, checkPassword, json, makeToken, passwordConfigured } from "../lib/shared.mjs";

const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!passwordConfigured()) {
    return json({ error: "Admin is not set up yet. Add an ADMIN_PASSWORD environment variable (10+ characters) in Netlify, then redeploy." }, 503);
  }

  const store = authStore();
  const ipKey = "fails-" + String(context.ip || "unknown").replace(/[^a-zA-Z0-9]/g, "_");
  const rec = (await store.get(ipKey, { type: "json" })) || { count: 0, since: Date.now() };
  if (Date.now() - rec.since > LOCK_MINUTES * 60e3) { rec.count = 0; rec.since = Date.now(); }
  if (rec.count >= MAX_FAILS) {
    return json({ error: `Too many attempts. Try again in ${LOCK_MINUTES} minutes.` }, 429);
  }

  let body = {};
  try { body = await req.json(); } catch {}

  if (!checkPassword(body.password)) {
    rec.count += 1;
    await store.setJSON(ipKey, rec);
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Wrong password." }, 401);
  }

  await store.delete(ipKey);
  return json({ token: makeToken() });
};

export const config = { path: "/api/admin/login" };
