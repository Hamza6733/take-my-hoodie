/* =========================================================================
   TAKE MY HOODIE — STORE SETTINGS
   -------------------------------------------------------------------------
   These are the DEFAULT settings. Once the site is on Netlify, edit everything
   from the admin page instead (yoursite.com/admin) — what you save there
   overrides this file. This file is still used for local previews and as a
   fallback if the admin data can't be loaded.

   (The only things NOT driven from here are the SEO <meta> tags at the top
   of each HTML file — see README.md → "Before you go live".)
   ========================================================================= */

window.TMH_CONFIG = {
  /* ---------- PAYMENTS (PayPal) ---------- */
  // Paste your LIVE client ID from developer.paypal.com → Apps & Credentials.
  // While this says YOUR_PAYPAL_CLIENT_ID the checkout shows a setup notice.
  paypalClientId: "YOUR_PAYPAL_CLIENT_ID",
  currency: "USD",

  /* ---------- PRODUCT ---------- */
  productName: "TAKE MY HOODIE — Drop 01",
  tagline: "If you want it, take it.",
  status: "open",        // "open" | "closed" | "soldout"
  price: 89,             // USD per hoodie
  shippingFlat: 0,       // USD per ORDER. 0 = "Free worldwide shipping"
  maxQty: 5,             // max hoodies per order

  colors: [
    { id: "black", name: "Washed Black", hex: "#141414" },
    { id: "bone",  name: "Bone",         hex: "#E7E1D3" }
  ],

  sizes: ["S", "M", "L", "XL", "XXL"],

  // Size chart in CENTIMETERS (inches are calculated automatically).
  // chest = pit-to-pit width laid flat, length = shoulder to hem, sleeve = shoulder seam to cuff
  sizeChart: {
    S:   { chest: 62, length: 68, sleeve: 58 },
    M:   { chest: 65, length: 70, sleeve: 60 },
    L:   { chest: 68, length: 72, sleeve: 62 },
    XL:  { chest: 71, length: 74, sleeve: 63 },
    XXL: { chest: 74, length: 76, sleeve: 64 }
  },

  /* ---------- DATES ---------- */
  // Countdown target. Keep the timezone offset at the end (-05:00 = New York winter time).
  presaleEnd: "2027-01-31T23:59:59-05:00",
  presaleEndLabel: "January 31, 2027",
  productionStart: "February 1, 2027",   // cancellations allowed until this date
  productionStartDate: "2027-02-01",
  shipDate: "March 15, 2027",
  shipDateDate: "2027-03-15",

  /* ---------- PRODUCT DETAILS (the "Details" section) ---------- */
  specs: [
    { label: "Fabric", value: "400gsm heavyweight", text: "100% cotton brushed fleece. Thick, structured, holds its shape wash after wash. Pre-shrunk." },
    { label: "Fit", value: "Oversized boxy", text: "Dropped shoulders, wide body, cropped slightly shorter for that boxy silhouette. Take your normal size for the intended fit, size down for a closer fit." },
    { label: "Print & embroidery", value: "Puff print + embroidery", text: "Raised puff-print logo on the chest, oversized back graphic, tonal embroidered tag on the sleeve. Double-layer hood, no drawcords, ribbed cuffs and hem." }
  ],

  /* ---------- PHOTOS ---------- */
  images: {
    hero: "images/hero.jpg",
    back: "images/back.jpg",
    detail: "images/detail.jpg",
    worn: "images/worn.jpg"
  },

  /* ---------- DROP ---------- */
  dropSize: 300,          // "First drop limited to ___ pieces" — update manually

  /* ---------- CONTACT / SOCIAL ---------- */
  email: "hello@takemyhoodie.com",
  instagram: "takemyhoodie",   // handle without @
  tiktok: "takemyhoodie"       // handle without @
};
