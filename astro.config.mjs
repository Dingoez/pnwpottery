// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Fully static output — no SSR/on-demand routes anywhere on this site, so no
  // @astrojs/cloudflare (or any) adapter is needed. Cloudflare Pages just serves dist/.
  output: 'static',
  // Required for @astrojs/rss and @astrojs/sitemap to emit absolute URLs.
  site: 'https://potterypnw.com',
  integrations: [sitemap()],
  build: {
    // Force external .css files instead of inlined <style> tags — the site's
    // CSP ships `style-src 'self'` with no `unsafe-inline`, so inline styles
    // would silently be blocked by the browser in production.
    inlineStylesheets: 'never',
  },
});
