# TAKE MY HOODIE — Drop 01 presale site

Plain HTML/CSS/JS + a small admin backend (Netlify Functions + Netlify Blobs). No build step.

```
public/                    ← the website (Netlify publishes this folder)
  index.html               main one-page drop
  admin/                   admin page → yoursite.com/admin
  shipping-policy.html  refund-policy.html  privacy-policy.html
  terms.html  contact.html  success.html  404.html
  css/style.css            all styling (accent color = --accent at the top)
  js/config.js             DEFAULT settings (used until you save in admin)
  js/main.js               site logic (countdown, gallery, PayPal, forms)
  images/                  default/placeholder photos + og-image.jpg
netlify/functions/         admin API (login, save product, upload photos, serve photos)
netlify/lib/shared.mjs     auth + validation
netlify.toml  package.json
```

## 1. Deploy (Git or CLI — not drag & drop)

The admin needs Netlify Functions, which **drag-and-drop deploys don't support**. Use one of:

- **GitHub (recommended):** push this folder to a GitHub repo → Netlify → *Add new site →
  Import an existing project* → pick the repo. Build command: *(leave empty)*.
  Publish directory and functions are read from `netlify.toml`. Every push redeploys.
- **Netlify CLI:** `npm install` then `npx netlify-cli deploy --prod` from this folder.

## 2. Set your admin password

Netlify → your site → **Site configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `ADMIN_PASSWORD` | a long password (10+ characters) |
| `ADMIN_SESSION_SECRET` *(optional)* | any random string, adds extra protection to login sessions |

Then **Deploys → Trigger deploy** so the functions pick it up. Changing the password logs out
every open admin session.

## 3. Use the admin page — `yoursite.com/admin`

Log in and edit everything, then hit **Save & publish**. Changes are live immediately (no redeploy):

- **Photos:** Front/Hero, Back, Detail, Worn. Drag & drop or tap to pick from your phone.
  Images are resized to max 1600px and compressed in the browser before upload.
  "Remove" goes back to the default file in `public/images/`.
- **Product:** name (shown in PayPal), tagline, price, shipping per order (0 = free), max per order, drop size.
- **Presale:** Open / Closed / Sold out switch, presale end (countdown), production start
  (cancellation cut-off), ship date. Dates update every page, including the policies.
- **Colors** (name + swatch), **sizes & size chart** (cm), the three **Details** blocks.
- **Contact & payments:** email, Instagram, TikTok, PayPal Client ID.

Safety built in: wrong-password lockout (8 tries → 15 min), sessions expire after 12 hours,
all input is validated on the server, the admin is hidden from search engines, and photos
you replace are cleaned up automatically.

`public/js/config.js` still holds the defaults — it's what the site shows before your first
save, when previewing locally, or if the admin data can't load.

## 4. Photos tips

Export as JPG, about **1600×2000 (4:5 portrait)**. The admin compresses for you, but
**under 300 KB each** keeps the page fast on phones.

The link-preview image (`public/images/og-image.jpg`, **1200×630**) and the home-screen icon
(`apple-touch-icon.png`, 180×180) are files, not admin uploads: replace them in the repo.
WhatsApp/Instagram previews are read by bots that don't run JavaScript, so they always use those files
and the text in the HTML `<meta>` tags.

## 5. Before you go live

1. **Domain in meta tags.** Search all `.html` files, `robots.txt` and `sitemap.xml` for
   `https://takemyhoodie.com` and replace with your real domain (or your `*.netlify.app` URL).
   Link previews need absolute URLs.
2. **SEO text.** The `<title>`, `<meta name="description">` and `og:` tags in `public/index.html`
   mention the price ($89), 300 pieces and March 15, 2027. Admin changes don't update these
   (link-preview bots don't run JavaScript), so edit them if you change price, size or ship date.
   Same for the JSON-LD `"price"` block.
3. **Policies.** Read every policy page and adjust to how you actually operate (refund terms,
   delivery estimates, customs). They're a solid starting draft, not legal advice.

## 6. PayPal setup

1. developer.paypal.com → **Apps & Credentials** → switch to **Live** → create an app → copy the **Client ID**.
2. Paste it into **admin → Contact & payments → PayPal Client ID** and save.
   To test first, use a **Sandbox** client ID and sandbox buyer accounts, then swap to Live.
3. Make sure guest card checkout is on: PayPal business account → Account Settings →
   Website payments → **PayPal account optional = On** (it's on by default for most accounts).
   Card availability depends on the buyer's country.
4. Each order shows in PayPal with the item name, SKU and description, e.g.
   `TAKE MY HOODIE — Drop 01 (Bone / L)` · `PRESALE | Color: Bone | Size: L | Qty: 2 | Ships by March 15, 2027`.
   The buyer's shipping address is collected by PayPal and shown on the transaction.

**Important:** the price is set in the browser (client-side checkout). That's normal for
small shops using PayPal Smart Buttons, but someone technical could tamper with the amount.
**Check that the amount paid matches before you ship any order.** Also, nothing stops sales
automatically at your drop size — watch your order count and switch the admin to **Sold out**
when you hit the limit.

## 7. Forms

Netlify detects the `waitlist` and `contact` forms automatically on deploy. Submissions appear
under **Site → Forms**. Turn on email notifications there (Forms → Form notifications).

## Handy

- Preview the post-payment screen: open `/#preview-thanks`.
- When the presale end date passes (or you pick Closed / Sold out in admin), the countdown shows "Presale closed", checkout is replaced by a
  closed message and the mobile button points to the Drop 02 waitlist.
- Local preview without the admin backend: `cd public && python3 -m http.server` (uses `js/config.js`).
- Change the accent color: `--accent` at the top of `public/css/style.css`
  (also update the `rgba(198, 255, 0, …)` in the `pulse` keyframes and `.callout`).
