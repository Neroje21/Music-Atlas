# Metal Atlas & Rock Atlas

Two visual explorers for loud music in one site: pick an atlas (**Metal** or **Rock**), pick a subgenre, meet its **Band of the Day**, browse the roster, and open any band for its lineup history, discography with full tracklists, and streaming links.

**2 atlases · 32 subgenres · 498 bands · 3,400+ albums · 37,000+ tracks**

Built with Next.js (App Router, Cache Components), React, Tailwind CSS v4 and Framer Motion. The whole thing is static data in the repo: no database and no API keys.

## Features

- **Landing page** with a door into each atlas, and a **Metal | Rock switch** in the header on every page.
- **Atlas homepages** (`/metal`, `/rock`): a subgenre grid, each tile showing a band from that genre. Each atlas has its own copy, colours and display font.
- **Subgenre dashboard** with a daily rotating Band of the Day and the full band roster.
- **Band profile** as a shared-element modal (the card expands into it) with an original vs. current lineup timeline, a discography carousel, album tracklists, a Spotify Top Tracks embed and similar bands.
- **Search** across subgenres, bands, members, albums and vibe tags (press `/`), limited to the atlas you are in, or across both from the landing page.
- **Deep links**: a band's profile lives at `/<atlas>/genre/<slug>?band=<id>`; Back closes it.
- **Listen links** to Spotify and YouTube Music (direct where known, a search link otherwise).
- `robots.txt` and `sitemap.xml`.

## Getting started

You need **Node.js 22.18 or newer** (the data scripts import TypeScript files directly).

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

Set `SITE_URL` (see [`.env.example`](.env.example)) when deploying so `robots.txt` and the sitemap use your real address. Both files are generated into `public/` by `scripts/generate-seo.mjs`, which runs automatically before `dev` and `build`.

## Deploy to GitHub Pages

The site can be published as a static export; the included workflow does it for you.

1. Push the repository to GitHub (branch `main`).
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow by hand). The site appears at `https://<user>.github.io/<repository>/`.

What the Pages build does differently, switched on by `GITHUB_PAGES=true` in [`next.config.ts`](next.config.ts) so a normal build is unaffected: it exports plain files (`output: "export"`), serves them under `/<repository>/` (`BASE_PATH`), and turns Cache Components off, which static export can't use.

Things to know:

- Band of the Day is picked in the visitor's browser (by UTC date), so it works without a server. That is true for the normal build too.
- GitHub Pages can't send response headers, so the Content Security Policy goes in a `<meta>` tag there. The other security headers (`X-Frame-Options`, `nosniff`, referrer and permissions policies) are not available on Pages.
- Search engines only read `robots.txt` from a domain's root, so on a project site (`user.github.io/repository/`) it is ignored. The sitemap still works if you submit it in Search Console. Both are fine on a custom domain.
- To try the Pages build locally: set `GITHUB_PAGES=true` and `BASE_PATH=/your-repo`, run `npm run build`, and serve the `out/` folder from a folder named like your repo. On Windows, Next's exporter writes some prefetch files with the wrong names (a Linux runner, as on GitHub, is fine), so links still work but you'll see harmless 404s for prefetch requests.

## Project layout

```
src/
  app/            routes: / (landing), /metal and /rock (atlas homepages),
                  /metal/genre/[slug] and /rock/genre/[slug]
  components/     cards, hero, search, header, footer, profile modal and its
                  sections; components/atlas holds the pages shared by both atlases
  data/
    genres/metal/ one file per Metal subgenre, hand-written band data
    genres/rock/  the same for the Rock Atlas
    *.json        generated: tracklists, streaming links, lineups, images
    mockData.ts   assembles both atlases' subgenres in homepage order
    helpers.ts    band() factory that merges the generated JSON into each band
  lib/            atlas definitions (copy, colours), band lookup, search scoring,
                  accent colours, band-of-the-day pick
scripts/          the data pipeline (below)
public/placeholders/logos/   generated fallback wordmarks
docs/project-brief.md        the original product brief
```

## Where the data comes from

Band names, countries, years, vibe tags, **original lineups** and album lists are written by hand in `src/data/genres/<atlas>/`. Everything else is fetched by scripts and committed as JSON, so the app never calls an API at runtime except to load images and embeds in the browser.

| Script | Fills | Source |
| --- | --- | --- |
| `npm run tracklists:wiki` | `tracklists.json` (primary) | Wikipedia |
| `npm run tracklists` | `tracklists.json` (fallback, missing albums only) | MusicBrainz |
| `npm run links` | `streaming-links.json` | MusicBrainz URL relations |
| `npm run lineups` | `lineups.json` (current lineups) | Wikipedia |
| `npm run images` | `images.json` (logo, photo, album covers) | TheAudioDB, Cover Art Archive, then Apple's iTunes Search for covers still missing |
| `npm run logos` | `public/placeholders/logos/*.svg` | generated locally |
| `node scripts/generate-seo.mjs` | `public/robots.txt`, `public/sitemap.xml` (run automatically by `dev` and `build`) | generated locally |
| `npm run verify:lineups` | prints bands whose hand-written names are not on their Wikipedia page | Wikipedia |

The scripts only fill gaps by default and accept `--force` or `--only <ids>`; MusicBrainz is rate-limited to one request per second, so a full run takes a while. Run MusicBrainz scripts one at a time.

### Adding a band or genre

1. Add the band to its file in `src/data/genres/<atlas>/` (copy an existing `band("<genre>", { ... })` block; every id in `similarBandIds` must exist, and band ids must be unique across **both** atlases). For a new genre, add a file and register it in `src/data/mockData.ts`; for a new atlas, also add it to `src/lib/atlases.ts` and give it routes under `src/app/<atlas>/`.
2. Run, in order: `npm run logos`, `npm run tracklists:wiki`, `npm run links`, `npm run tracklists`, `npm run images`, `npm run lineups`.
3. Check the result: `npm run typecheck`, then look at the band in the browser.

Two things to know:

- **Album ids are positional** (`<band-id>-<n>`) and every generated JSON is keyed by them. Don't delete or reorder an album in the middle of a band without clearing that band's cached entries and refetching.
- `src/data/mockData.ts` and `helpers.ts` are imported straight by Node, so relative imports there end in `.ts`, JSON imports use `with { type: "json" }`, and `@/` aliases are type-only.

## Security

The site is static data rendered by Next.js: no database, no accounts, no API routes, no server actions and no secrets. The only environment variable (`SITE_URL`) is public.

- Production responses carry a Content Security Policy (scripts and styles from the site itself, frames only from `open.spotify.com`, no plugins, no framing of the site), plus `nosniff`, `X-Frame-Options`, a referrer policy and a permissions policy. See [`next.config.ts`](next.config.ts). Add `Strict-Transport-Security` on your host if it doesn't already.
- Outbound links use `rel="noopener noreferrer"`, embed URLs are built from a validated Spotify ID, and nothing renders raw HTML.
- The data scripts use TheAudioDB's public free key (`123`), which is not a secret. If you get your own key, read it from an environment variable rather than committing it.
- Visitors' browsers load images from TheAudioDB, the Cover Art Archive (which redirects to archive.org), Apple's image servers and picsum.photos, and the Spotify embed from Spotify, so those services see their requests.
- CI runs on a read-only token and Dependabot watches npm and Actions updates.

## Credits and disclaimer

This is an unofficial fan project, not affiliated with any band, label or service named in it.

- Tracklists and current lineups are compiled from [Wikipedia](https://www.wikipedia.org/) (text available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)) and [MusicBrainz](https://musicbrainz.org/) (CC0 core data).
- Band logos and photos come from [TheAudioDB](https://www.theaudiodb.com/) and album covers from the [Cover Art Archive](https://coverartarchive.org/) (plus a few from Apple's iTunes Search). A handful of bands have no logo in any source and show a generated wordmark. All of these images are **hotlinked, not stored in this repo**, and remain the property of their owners. Check the terms of those services and the rights holders before using the site commercially.
- Listen links go to Spotify and YouTube Music.
- Original lineups are written from memory and may contain mistakes; corrections are welcome.
