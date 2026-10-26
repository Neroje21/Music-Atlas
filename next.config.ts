import type { NextConfig } from "next";

// `GITHUB_PAGES=true` builds a static export for GitHub Pages (see
// .github/workflows/pages.yml). BASE_PATH is the repository path, e.g.
// "/metal-atlas", or empty for a user site. Without the flag nothing changes:
// the normal server build, with security headers.
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? (process.env.BASE_PATH ?? "").replace(/\/+$/, "") : "";

// Images are hotlinked from several hosts (TheAudioDB, the Cover Art Archive and
// the archive.org mirrors it redirects to, picsum.photos), so any https image is
// allowed. Scripts need 'unsafe-inline' because the prerendered pages carry
// Next's inline bootstrap scripts, which a per-request nonce can't cover.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://open.spotify.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only turns off what the site never uses; the Spotify embed's own
  // autoplay/fullscreen permissions are untouched.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // The dev server needs eval and websockets for hot reload, so the CSP is
  // only sent by `next build` / `next start`.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value: [...cspDirectives, "frame-ancestors 'none'"].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  /* config options here */
  // Partial prerendering can't be used in a static export.
  cacheComponents: !isPages,
  partialPrefetching: !isPages,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    // GitHub Pages can't send headers, so the layout puts the CSP in a <meta>
    // tag instead (which can't express frame-ancestors).
    NEXT_PUBLIC_META_CSP: isPages ? cspDirectives.join("; ") : "",
  },
  ...(isPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        ...(basePath ? { basePath } : {}),
      }
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
  images: {
    // Band logos, photos and covers are hotlinked from TheAudioDB and the Cover
    // Art Archive (placeholders: picsum.photos and local SVGs), so skip the
    // optimizer rather than whitelisting every host.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
