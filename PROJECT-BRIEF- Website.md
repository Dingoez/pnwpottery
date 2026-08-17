# pnwpottery.com — Project Brief

Written as input to Claude Code plan mode. Drop this in the repo root and reference it in the
first session. Everything marked **DECIDED** is settled; everything marked **OPEN** should be
resolved during planning.

---

## 1. Purpose

Three audiences, in priority order:

1. **Buyers** — should be able to see a piece and buy it without friction or an account.
2. **Prospective employers** — the site is a portfolio artifact. It needs to look intentional and
   stand up to someone opening devtools or running Lighthouse.
3. **Other potters / blog readers** — the blog and a "Things I Like" page carry the personality.

**Primary conversion goal:** visitor views standout pieces, then reads a blog post. Purchase is a
strong secondary. Design decisions should favor "make the work look good and make the writing
findable" over aggressive commerce patterns.

**Domain:** pnwpottery.com (already owned)

**The dual mandate is the main design tension.** "Portfolio of pots" wants near-invisible chrome.
"Proof I can build" wants visible craft. Resolution: the craft shows in performance, accessibility,
typed content, and security headers — not in visual busyness. Restraint is the more impressive
signal to a technical reviewer. Do not let this become a JS playground.

---

## 2. Framework — **DECIDED: Astro**

Reasons, so this can be argued with:

- **Content collections with Zod schemas.** Piece metadata (clay, glaze, dimensions, price) gets
  typed and validated at build time. A piece missing its glaze fails the build instead of shipping
  a blank field. This directly serves the employer-signal goal.
- **Built-in image pipeline.** `<Picture>` generates AVIF/WebP + `srcset` at build time. Solves the
  4MB-JPEG problem with no third-party service and no runtime cost.
- **Zero JS by default.** Gallery pages ship as HTML+CSS. JS only where opted in (lightbox).
- **Markdown blog + RSS native.** No plugin archaeology.
- **Static output.** Deploys anywhere free.

Rejected alternatives: **Eleventy** (simpler, but the image story is manual and the schema story is
nonexistent); **Next.js** (server machinery this site never needs; reads as over-engineering);
**Squarespace** (what the reference site uses — fine for pottery, useless for goal #2).

---

## 3. Content model — **DECIDED**

```
src/content/
  pieces/
    mug-nori-drip-01.md
    vase-tall-celadon-03.md
  posts/
    2026-09-first-soda-firing.md
  likes/            # or a single likes.json — decide in planning
src/assets/pieces/
  mug-nori-drip-01/
    01.jpg  02.jpg  03.jpg
```

### Piece schema

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `series` | string? | optional grouping (e.g. "Nori Drip") |
| `date` | date | completed / fired |
| `clay` | string | required |
| `glaze` | string | required |
| `dimensions` | string or `{h,w,d}` | decide in planning; string is simpler, object enables sorting |
| `price` | number? | **omit = not for sale.** Gallery-only / archive piece |
| `sold` | boolean | default `false`. Only renders a badge when `true` — never render "Available" |
| `stripeUrl` | string? | required if `price` is set |
| `images` | array of `{src, alt}` | first entry is the hero. **`alt` required** |
| `featured` | boolean | drives homepage standouts |
| `description` | string? | **optional on purpose** — see below |

### The description gap

20 pieces are photo-ready but have no written descriptions. Do not let copywriting block launch.
`description` is optional; the piece detail page renders cleanly without it. Backfill later — and
drafting descriptions from metadata + photo with Claude is itself a legitimate part of the
"AI-assisted build" story.

### Gallery vs. Shop

These overlap and the overlap is the point. One collection, two filtered views:

- **Gallery** — everything, including sold and never-for-sale pieces. Grouped by series or by year
  (the reference site uses year, and it scales well over a decade). This is the portfolio.
- **Shop** — filtered to `price != null && sold == false`. This is the storefront.
- **Piece detail** (`/pieces/[slug]`) — shared template. Buy button renders only when purchasable.

---

## 4. Publishing workflow — **DECIDED: git-based**

`git add` → commit → push → auto-deploy. Confirmed acceptable at 5–10 pieces/month, batched monthly.

Photos originate on a camera and land on the laptop. Phone publishing is explicitly **not** a
requirement for v1; do not add a CMS to enable it. If it becomes one later, the escape hatch is
Astro's content layer plus a headless CMS pointed at the same schema — a v2 concern, not now.

Export spec for source photos: **2400px longest edge, sRGB, JPEG quality 85.** Astro derives
everything smaller. Do not commit anything larger; the repo will bloat.

---

## 5. Images — **DECIDED**

- `<Picture>` with widths `[400, 800, 1200, 1800]`, formats `[avif, webp]`, jpg fallback.
- **Grid thumbnails: fixed 4:5 aspect ratio, `object-fit: cover`.** Shooting setup is
  "consistent-ish and improving" — a locked aspect ratio makes the grid read as intentional even
  when individual crops drift. This is the single highest-leverage visual decision on the site.
- Up to 4 shots per piece; most pieces have 1. Detail page: hero + thumbnail strip that only
  renders when `images.length > 1`.
- **Lightbox with zoom** for detail shots. Small vanilla island loaded `client:visible` — not a
  library. Must be keyboard-accessible (arrows, Esc) and focus-trapped.
- `loading="eager"` + `fetchpriority="high"` on the homepage hero only. Everything else lazy.
- **Budget:** gallery page under ~1MB total, LCP under 2.5s on simulated 4G. State the number in
  the README; an employer may well run Lighthouse.

---

## 6. Commerce — **DECIDED: Stripe Payment Links**

Selling from launch. One-of-a-kind inventory, quantity 1 per piece. Willing to ship and to do
local Seattle pickup.

**Mechanism:** one Stripe Payment Link per piece, created in the dashboard, with **the payment
limit set to 1**. Paste the URL into frontmatter. Shop button links straight out to Stripe.

Why this wins:

- **Free until you sell.** No monthly fee; 2.9% + 30¢ per transaction.
- **The payment limit is the real inventory safety net.** Site rebuilds are monthly, so between a
  sale and your next push the site still shows the piece as available. The limit means the second
  buyer hits a deactivated link instead of paying you for a mug that's gone. Ugly, but *safe* —
  and safety matters more than polish on the one thing that could genuinely cost you. Is there a way to immidiately change the status to sold if the item is bought? This would be before I remove it from the shop. It could still stay in the gallery if I wanted to show it off. 
- **Nothing sensitive touches your site.** No card data, no PCI scope, no backend, no secrets in
  the repo. Stripe Checkout collects the shipping address and applies shipping rates you configure.
- Configure two shipping rates: **local pickup ($0, Seattle)** and **domestic flat rate**, ideally
  split small/large (mug vs. vase). Set these once in Stripe.

Rejected: **Big Cartel** (free tier caps at 5 products — dead on arrival with 20 pieces);
**Shopify** (~$39/mo and wants to own the storefront, defeating goal #2); **Snipcart/Ecwid** (JS
weight plus cost for a cart you don't need when every item is quantity 1).

**Sold-status handling, three layers:**

1. Stripe payment limit prevents the double-sale. Immediate, automatic.
2. You flip `sold: true` and push. Cosmetic, monthly cadence is fine. Amny way to automate this? 
3. *v2, out of scope:* a Cloudflare Worker on a Stripe webhook that commits the frontmatter change
   via the GitHub API. Genuinely impressive to show — but build it after the site ships, not before.

---

## 7. Deploy — **DECIDED: Cloudflare Pages**

- `git push` to `main` → build → live in about a minute. Free tier, unmetered bandwidth.
- Custom domain pnwpottery.com, free SSL.
- **Preview deploys on pull requests** — turn this on. It costs nothing and it's a practice a
  technical reviewer will notice.
- Netlify is a near-equivalent substitute; pick one and move on.

---

## 8. Visual direction

**Position:** gallery restraint for the work, palette personality for the chrome.

The references pull in two directions. Steven Young Lee and Alphonse Studio are austere — white
space, huge photos, almost no interface. Silver Lining Ceramics is a warm shop. The Moonrise
Kingdom palette is pure personality. So: **pieces sit on near-white with generous whitespace and
no decoration; nav, blog, FAQ, and Things I Like carry the color.**

### Palette — Moonrise Kingdom (Moonrise2 + Moonrise3, verified hex)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#29211F` | body text — warm near-black, never pure `#000` |
| `--paper` | `#FAF8F4` | page background — warm off-white, never pure `#fff` |
| `--sand` | `#CDC08C` | rules, borders, muted fills |
| `--sage` | `#798E87` | secondary text, captions, metadata |
| `--terracotta` | `#C27D38` | primary accent — links, buy button |
| `--sky` | `#85D4E3` | blog + Things I Like accent, hover states |
| `--blush` | `#F4B5BD` | sparing — tags, sold badge |
| `--butter` | `#FAD77B` | sparing — highlights only |

**Rule:** piece and gallery pages use `ink / paper / sand / sage` only, plus `terracotta` for
actions. `sky / blush / butter` live in the blog and Things I Like. This is what keeps the
personality from competing with the pots.

### Typography

- **Display:** fugue-paper-sans-regular (variable — the optical-size and "wonk" axes give warmth without twee).
- **Body/UI:** Karla. Pairs well with Fraunces, has character in the lowercase.
- **Piece metadata:** letterspaced small-caps or mono, treated as a **museum placard**. Clay,
  glaze, dimensions rendered as a gallery label rather than a spec table. Cheap move, big payoff.
- **Self-host via Fontsource (npm).** No Google Fonts request — better privacy, better LCP, one
  fewer third party, and it's consistent with the security posture below.
- Type scale ratio 1.2–1.25. Prose measure ~65ch. Blog line-height 1.65.

### Maker's mark

Logo exists and doubles as the physical chop on the pots — the strongest identity asset here; lead
with it. It's still being refined, so **build the header to consume a swappable SVG**, don't inline
the paths into markup.

---

## 9. Pages

| Page | Contents |
|---|---|
| **Home** | One strong hero photo, 4–6 featured pieces, latest 2 blog posts |
| **About** | Photo, bio, studio co-op, the maker's-mark story |
| **Gallery** | All pieces, grouped by series or year |
| **Shop** | Purchasable subset |
| **Piece detail** | `/pieces/[slug]` — images, placard metadata, buy button when applicable |
| **FAQ** | Food-safe / dishwasher / microwave, care, shipping, lead time, pickup, custom orders |
| **Blog** | Markdown posts, tags, **RSS feed** |
| **Things I Like** | Annotated link list — the personality page |
| **Contact** | **OPEN** — not in the original list, but needed for custom inquiries |

---

## 10. Deliberate employer-facing choices

Since the site is a work sample, these are requirements rather than nice-to-haves:

- **README documenting architecture decisions and the reasoning.** The most-read file in the repo.
- **Lighthouse 95+ on all four axes**, with the number stated in the README.
- **Typed content schema** — build fails on malformed data.
- **Real alt text on every image**, semantic HTML, keyboard-navigable lightbox.
- **Strict security headers** via a Cloudflare `_headers` file: CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. No third-party scripts, so a
  genuinely strict CSP is achievable — most sites can't manage this. Pin dependencies and enable
  Dependabot.

That last item is worth the effort beyond general good practice: a ceramics site with a clean CSP
and no third-party trackers is an unusually credible artifact for someone selling cloud security.
It demonstrates the posture rather than describing it.

---

## 11. Open questions for plan mode

1. `dimensions` as a formatted string or a `{h,w,d}` object?
2. Gallery grouped by **series** or by **year**? (Year scales; series tells a better story.)
3. Contact page — mailto link, or a form? A form means either a third-party endpoint or a Worker,
   and it complicates the CSP.
4. Email list / newsletter — in scope for v1, or defer? (Most third-party embeds would breach the
   strict-CSP goal.)
5. Instagram feed on the homepage — the reference site has one. Third-party JS; recommend a static
   linked grid or nothing.
6. Things I Like — a content collection, or one hand-edited data file?
7. Blog tone and cadence, since it's a stated primary draw.

---

## 12. Suggested build order

Deliberately deploys before it designs, so the pipeline is never the unknown.

0. **Scaffold + deploy + domain.** Blank Astro site live on pnwpottery.com. Do this first.
1. **Content schema + 3 sample pieces + gallery grid + piece detail template.**
2. **Design system** — tokens, self-hosted fonts, layout primitives.
3. **Remaining static pages** — Home, About, FAQ.
4. **Blog + RSS + Things I Like.**
5. **Stripe links + Shop filtering + FAQ shipping copy.**
6. **Polish** — lightbox, security headers, Lighthouse pass, SEO + OG images.
7. **Load the remaining 17 pieces.**

Backfill descriptions after step 7. Do not let copy block the build.
