# Pottery PNW

The portfolio and shop for [potterypnw.com](https://potterypnw.com) — a Seattle ceramics
practice. Static site, no backend, no third-party scripts, no cookies.

This README documents the architecture decisions and the reasoning behind them. Where a
choice looks unusual, the reason is written down rather than left to be inferred.

---

## Stack

| | |
|---|---|
| **Framework** | Astro 7 (static output) |
| **Content** | Markdown + YAML, typed with Zod content collections |
| **Images** | Astro's build-time pipeline (sharp) → AVIF / WebP / JPEG |
| **Fonts** | Self-hosted woff2 (Fugue Paper Sans, Karla Variable) |
| **Commerce** | Stripe Payment Links — no cart, no backend, no PCI scope |
| **Hosting** | Cloudflare Workers static assets, deployed from `main` |

```sh
npm install
npm run dev      # localhost:4321
npm run build    # → dist/
npm run preview
```

---

## Decisions

### Astro, static output, no adapter

Every route is known at build time, so the site ships as plain files. There is no SSR, no
API route, and therefore **no `@astrojs/cloudflare` adapter** — a reviewer looking for one
should know it's absent on purpose, not by omission. `wrangler.json` declares
`assets.directory` so the deploy serves `dist/` directly.

Rejected: Eleventy (manual image pipeline, no schema story), Next.js (server machinery this
site never needs), Squarespace (fine for pottery, useless as a work sample).

### Content is typed, and bad data fails the build

`src/content.config.ts` defines Zod schemas for three collections. This is the load-bearing
decision behind the whole content model: a piece missing its glaze, an image with an empty
`alt`, or a price without a payment link **fails `npm run build`** rather than shipping a
blank field.

The `pieces` schema uses `.superRefine()` for a constraint a plain object schema can't
express: `price` and `stripeUrl` must appear together. A price with no way to pay, or a
payment link with no displayed price, is almost always an authoring mistake, so both
directions are errors.

`images[].src` uses Zod's `image()` helper rather than plain strings, so a typo'd filename
is a build error with a real message instead of a broken `<img>` at runtime.

### One collection, two views

Gallery and Shop read the same `pieces` collection through shared helpers in
`src/lib/pieces.ts`:

- **Gallery** — everything, grouped by year. Includes sold and never-for-sale work.
- **Shop** — `price != null && sold === false`.

Both call the same helper, so the two views cannot drift apart about what's for sale.
`sold: true` renders a badge; there is deliberately no "Available" badge — absence of the
badge is the signal.

### Commerce: Payment Links, and a guard against dead checkouts

One Stripe Payment Link per piece, **with the payment limit set to 1**. That limit is the
real inventory safety net: the site rebuilds when I push, so between a sale and the next
deploy the piece still looks available. The limit means the second buyer hits a deactivated
link instead of paying for a mug that's already gone. Ugly, but safe — and safety matters
more than polish on the one thing that can actually cost someone money.

Nothing sensitive touches this site. No card data, no secrets in the repo, no PCI scope.
Stripe Checkout collects the shipping address and applies the configured rates.

Pieces whose `stripeUrl` is still a placeholder **do not render a Buy button.** The site is
public, and a button pointing at a placeholder URL would hand a real visitor a dead
checkout. Those pieces show the price and an email fallback instead, and flip to a live
button automatically once a real link lands — see `isLivePaymentLink()` in
`src/lib/pieces.ts`.

*Out of scope, deliberately:* a Worker on a Stripe webhook that commits `sold: true` via the
GitHub API. Worth building after the site ships, not before.

### Security headers

`public/_headers` ships a strict CSP with no `'unsafe-inline'` anywhere:

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self';
form-action 'none'; object-src 'none'; upgrade-insecure-requests
```

Plus HSTS (2y, preload), `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, and `X-Frame-Options`.

Three things make this achievable where most sites can't:

- **`style-src 'self'` required a build change.** Astro inlines component styles into
  `<style>` tags by default, which the CSP would silently block in production — and local
  dev never applies `_headers`, so it looks fine right up until it isn't.
  `build.inlineStylesheets: 'never'` forces external stylesheets instead.
- **Stripe never appears in the CSP.** Buy buttons are plain `<a href>` navigations that
  leave the site — not iframes, not fetch — so `connect-src` and `frame-src` stay locked to
  `'self'`. A commerce-enabled site can still ship a maximally strict policy.
- **`form-action 'none'`** is safe because Contact is a `mailto:` link. There is no `<form>`
  on the site. **Adding one means loosening this directive first.**

Fonts are self-hosted rather than loaded from Google Fonts: one fewer third party, no
requests leaking visitor IPs, and `font-src 'self'` stays honest.

---

## Measurements

Real numbers, measured — not aspirational.

**Lighthouse 13.4.1, mobile, against production** (2026-08-26):

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Home | 96 | 95 | 92 | 100 |
| Gallery | 99 | 94 | 92 | 100 |

Home: LCP 1.9 s, CLS 0, TBT 0 ms. Gallery: LCP 1.6 s, CLS 0.01, 64 KiB total.

**Page weight** (HTML + CSS + fonts + largest image variant offered):

| Page | Weight |
|---|---|
| Home | ~172 KB |
| Gallery | ~75 KB |
| Blog post | ~72 KB |

Budget: gallery under 1 MB, LCP under 2.5 s on simulated 4G. Both currently hold with room
to spare — but note the piece photos are **still placeholders** that compress
unrealistically well. The gallery number will rise substantially once real photography
lands, which is the point at which the budget actually gets tested.

### Known gaps

Written down rather than quietly omitted:

1. **Best Practices is 92, not 95+.** Cloudflare auto-injects its Web Analytics beacon
   (`static.cloudflareinsights.com/beacon.min.js`) into the response. The CSP correctly
   blocks it, and Lighthouse counts the resulting console errors against the page. The fix
   is to disable Web Analytics for the zone — the score is being docked for a third-party
   script the site never asked for, which is the CSP doing its job.
2. **Link contrast is ~3.15:1.** Terracotta (`#C27D38`) on paper (`#FAF8F4`) sits below the
   WCAG AA 4.5:1 threshold for body text. Needs a darker shade for text links; the brand
   terracotta can stay on button backgrounds.
3. **Piece photography is placeholder.** See above.
4. **The maker's mark is a text wordmark.** `SiteMark.astro` is built to consume a swappable
   SVG — drop the file in and change one component.

---

## Content

```
src/content/
  pieces/*.md          one file per piece
  posts/*.md           blog, drafts excluded from build
  likes/likes.yaml     Things I Like, one typed data file
src/assets/pieces/<slug>/01.jpg …
```

Publishing is `git push`. A new post appears live in about a minute with no code changes.

**Photo export spec: 2400 px longest edge, sRGB, JPEG quality 85.** Astro derives everything
smaller. Don't commit anything larger — the repo will bloat.

Adding a piece: create the markdown, drop photos in `src/assets/pieces/<slug>/`, reference
them with paths relative to the content file (`../../assets/pieces/<slug>/01.jpg`). Omit
`price` for archive pieces. Build will tell you what's missing.

### `likes.yaml` has an explicit `order` field

`getCollection` returns entries sorted by id, which alphabetized the list and buried the
studio that matters most. `order` makes file order authoritative.

---

## Dates are UTC on purpose

Bare frontmatter dates (`date: 2026-08-19`) parse as UTC midnight. Formatting them in a
negative-offset timezone renders the previous day — a post dated the 19th showed as the
18th. `formatDate()` formats in UTC, and `groupByYear()` uses `getUTCFullYear()` for the
same reason.

---

## Layout

```
src/
  components/    PieceCard, PiecePlacard, BuyButton, SiteMark, …
  layouts/       BaseLayout → PageLayout
  lib/           pieces.ts, posts.ts, format.ts, site.ts
  pages/         file-based routes + rss.xml.ts
  styles/        tokens.css, fonts.css, base.css
public/_headers  security headers, copied verbatim into dist/
```

Design tokens are CSS custom properties in `tokens.css`. Convention, not enforced by tooling:
piece, gallery and shop pages use `ink / paper / sand / sage` plus `terracotta` for actions;
`sky / blush / butter` are reserved for the blog and Things I Like, so the personality
doesn't compete with the pots.

The site name lives in `src/lib/site.ts` — it was hardcoded in six places until it needed
changing twice.
