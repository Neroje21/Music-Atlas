import type { Band, StreamingLinks, Track } from "@/types/metal";
import imageData from "./images.json" with { type: "json" };
import lineupData from "./lineups.json" with { type: "json" };
import linkData from "./streaming-links.json" with { type: "json" };
import tracklistData from "./tracklists.json" with { type: "json" };

/*
 * Band facts (lineups, years, discographies) were written from memory.
 * Entries marked `verify` are the ones least certain; check them against
 * Wikipedia / Metal Archives before relying on them.
 *
 * Tracklists are not written by hand. tracklists.json is keyed by album id
 * ("<band-id>-<n>", where n is the album's position in the list below) and is
 * filled by two scripts: `npm run tracklists` (MusicBrainz, the fallback) and
 * then `npm run tracklists:wiki` (Wikipedia, which wins where it has a listing).
 *
 * Spotify / YouTube Music links work the same way: `npm run links` fills
 * streaming-links.json with direct URLs from MusicBrainz, and anything it
 * couldn't find falls back to a search link (see buildLinks above).
 *
 * Images: `npm run images` fills images.json with the URL of a real logo and
 * photo for each band (TheAudioDB) and a cover for each album (Cover Art
 * Archive). They are loaded straight from those services, not copied here.
 * Anything it couldn't find falls back to the placeholders below, and a local
 * file (e.g. /bands/<id>/photo.jpg under public/) can replace any of them.
 */

const tracklists = tracklistData as Record<string, { tracks: Track[] }>;

// Current lineups read from Wikipedia by `npm run lineups`. They win over the
// `currentLineup` typed in each genre file, which is only a fallback.
const currentLineups = lineupData as Record<string, { current: string[] }>;

const lineupKey = (entry: string) =>
  entry
    .split(" — ")[0]
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const surnameKey = (entry: string) => lineupKey(entry.split(" — ")[0].trim().split(/\s+/).pop() ?? "");

/**
 * Wikipedia's list wins. Where it gives a name with no role, borrow the role
 * from the matching hand-written entry (same name, or the same surname when
 * that is unambiguous). A bare name that a fuller entry already contains
 * (`Ravn` next to `Olav "Ravn" Bergene — Lead vocals`) is dropped.
 */
function mergeLineup(fromWikipedia: string[] | undefined, handWritten: string[]): string[] {
  if (!fromWikipedia) return handWritten;
  const withRole = handWritten.filter((e) => e.includes(" — "));
  const roleOf = (e: string) => e.split(" — ").slice(1).join(" — ");
  const roles = new Map(withRole.map((e) => [lineupKey(e), roleOf(e)]));
  const surnames = new Map<string, string | null>();
  for (const e of withRole) {
    const key = surnameKey(e);
    surnames.set(key, surnames.has(key) ? null : roleOf(e));
  }

  const filled = [...new Set(fromWikipedia)].map((entry) => {
    if (entry.includes(" — ")) return entry;
    const role = roles.get(lineupKey(entry)) ?? surnames.get(surnameKey(entry));
    return role ? `${entry} — ${role}` : entry;
  });

  const fullKeys = filled.filter((e) => e.includes(" — ")).map(lineupKey);
  return filled.filter((e) => {
    if (e.includes(" — ")) return true;
    const key = lineupKey(e);
    return key.length < 4 || !fullKeys.some((full) => full.includes(key));
  });
}

// Direct streaming URLs found by `npm run links`; either may be missing.
interface DirectLinks {
  spotify?: string;
  youtubeMusic?: string;
}
const directLinks = linkData as {
  bands: Record<string, DirectLinks>;
  albums: Record<string, DirectLinks>;
};

/**
 * Direct links where we have them, otherwise a search for `query` on that
 * service, so every band and album always has somewhere to go.
 */
function buildLinks(direct: DirectLinks | undefined, query: string): StreamingLinks {
  const q = encodeURIComponent(query);
  return {
    spotify: direct?.spotify
      ? { url: direct.spotify, direct: true }
      : { url: `https://open.spotify.com/search/${q}`, direct: false },
    youtubeMusic: direct?.youtubeMusic
      ? { url: direct.youtubeMusic, direct: true }
      : { url: `https://music.youtube.com/search?q=${q}`, direct: false },
  };
}

/** Spotify's embeddable player (which lists top tracks) for an artist link. */
function spotifyArtistEmbed(spotifyUrl: string | undefined): string | null {
  const id = /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/.exec(spotifyUrl ?? "")?.[1];
  return id ? `https://open.spotify.com/embed/artist/${id}?theme=0` : null;
}

// Real image URLs found by `npm run images`; any of them may be missing.
const realImages = imageData as {
  bands: Record<string, { logo?: string; photo?: string }>;
  albums: Record<string, { cover?: string }>;
};

// Placeholders, used when no real image was found.
const photo = (seed: string) =>
  `https://picsum.photos/seed/${seed}/1200/800?grayscale`;
const cover = (seed: string) =>
  `https://picsum.photos/seed/${seed}/400/400?grayscale`;
// Prefixed on GitHub Pages, where the site is served from /<repository>/.
const logo = (id: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/placeholders/logos/${id}.svg`;

type BandInput = Omit<
  Band,
  | "subgenreId"
  | "logoUrl"
  | "photoUrl"
  | "albums"
  | "audioEmbedUrl"
  | "topTracksEmbedUrl"
  | "links"
> & {
  albums: [title: string, year: number][];
};

export function band(subgenreId: string, input: BandInput): Band {
  const { albums, ...rest } = input;
  return {
    ...rest,
    currentLineup: mergeLineup(currentLineups[input.id]?.current, input.currentLineup),
    subgenreId,
    logoUrl: realImages.bands[input.id]?.logo ?? logo(input.id),
    photoUrl: realImages.bands[input.id]?.photo ?? photo(input.id),
    albums: albums.map(([title, year], i) => {
      const id = `${input.id}-${i + 1}`;
      return {
        id,
        title,
        year,
        coverUrl: realImages.albums[id]?.cover ?? cover(id),
        tracks: tracklists[id]?.tracks ?? [],
        links: buildLinks(directLinks.albums[id], `${input.name} ${title}`),
      };
    }),
    audioEmbedUrl: null,
    // Spotify's artist embed lists the band's top tracks.
    topTracksEmbedUrl: spotifyArtistEmbed(directLinks.bands[input.id]?.spotify),
    links: buildLinks(directLinks.bands[input.id], input.name),
  };
}
