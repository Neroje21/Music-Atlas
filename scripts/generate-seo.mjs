// Writes public/robots.txt and public/sitemap.xml. Runs before `dev` and `build`.
//
// They are plain files rather than app/robots.ts and app/sitemap.ts because a
// static export (GitHub Pages) needs those routes marked `force-static`, which
// Cache Components doesn't allow.
//
//   SITE_URL     public origin, e.g. https://example.com (default: localhost)
//   GITHUB_PAGES "true" for the Pages build: pages become directories
//   BASE_PATH    "/<repository>" on a GitHub Pages project site
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";

const origin = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const isPages = process.env.GITHUB_PAGES === "true";
const root = origin + (isPages ? (process.env.BASE_PATH ?? "").replace(/\/+$/, "") : "");
const slash = isPages ? "/" : "";

// The landing page, one page per atlas, and one per subgenre.
const atlasIds = [...new Set(subgenres.map((s) => s.atlas))];
const pages = [
  { url: `${root}/`, priority: 1 },
  ...atlasIds.map((atlas) => ({ url: `${root}/${atlas}${slash}`, priority: 0.9 })),
  ...subgenres.map((s) => ({
    url: `${root}/${s.atlas}/genre/${s.slug}${slash}`,
    priority: 0.8,
  })),
];

const robots = `User-Agent: *\nAllow: /\n\nSitemap: ${root}/sitemap.xml\n`;

// No <lastmod>: the band data lives in the source, not a database.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) =>
      `<url>\n<loc>${p.url}</loc>\n<changefreq>monthly</changefreq>\n<priority>${p.priority}</priority>\n</url>`,
  )
  .join("\n")}
</urlset>
`;

const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
writeFileSync(out("robots.txt"), robots);
writeFileSync(out("sitemap.xml"), sitemap);
console.log(`robots.txt and sitemap.xml written (${pages.length} pages, ${root})`);
