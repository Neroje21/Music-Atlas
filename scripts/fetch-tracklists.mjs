// Fills src/data/tracklists.json with album tracklists from MusicBrainz.
//
//   npm run tracklists                      fetch albums that have no entry yet
//   npm run tracklists -- --force           refetch everything
//   npm run tracklists -- --only death-3    refetch specific album ids
//
// For each album in mockData.ts it finds the matching release group (artist,
// title and a release year within two years of ours), then reads the tracklist
// of the earliest official release. MusicBrainz asks for at most one request
// per second, so a full run takes several minutes.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";
import { browseReleaseGroups, matchReleaseGroup } from "./lib/musicbrainz.mjs";

const OUT = fileURLToPath(new URL("../src/data/tracklists.json", import.meta.url));
const BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 1100;

// Album titles that MusicBrainz spells differently. Key: album id.
const TITLE_OVERRIDES = {
  "saint-vitus-6": "C. O. D.",
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx === -1 ? null : new Set(args[onlyIdx + 1].split(","));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const escapeQuery = (s) => s.replace(/(["\\])/g, "\\$1");

let lastRequest = 0;
async function mb(path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("fmt", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_GAP_MS - Date.now()));
    lastRequest = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 503 || res.status === 429) {
        await sleep(3000 * attempt);
        if (attempt < 6) continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(2000 * attempt);
    }
  }
}

// Artist ids found by `npm run links`; far more reliable than matching on the name.
const LINKS = fileURLToPath(new URL("../src/data/streaming-links.json", import.meta.url));
const artistIds = JSON.parse(readFileSync(LINKS, "utf8")).bands;

// Albums first; EPs and singles (Kanonenfieber's EPs, say) only if nothing
// matches; and as a last resort, the artist's whole discography matched locally
// (MusicBrainz's text search trips over punctuation like "Closure/Continuation").
async function findReleaseGroup(band, album, title) {
  return (
    (await searchReleaseGroups(band, album, title, true)) ??
    (await searchReleaseGroups(band, album, title, false)) ??
    (await browseDiscography(band, album, title))
  );
}

const discographies = new Map();
async function browseDiscography(band, album, title) {
  const arid = artistIds[band.id]?.mbid;
  if (!arid) return null;
  if (!discographies.has(arid)) discographies.set(arid, await browseReleaseGroups(arid));
  const group = matchReleaseGroup(discographies.get(arid), { ...album, title });
  if (!group) return null;
  const year = parseInt(group["first-release-date"], 10);
  return { group, yearDiff: Number.isNaN(year) ? 99 : Math.abs(year - album.year) };
}

async function searchReleaseGroups(band, album, title, albumsOnly) {
  const arid = artistIds[band.id]?.mbid;
  const type = albumsOnly ? " AND primarytype:album" : "";
  const query = arid
    ? `releasegroup:"${escapeQuery(title)}" AND arid:${arid}${type}`
    : `releasegroup:"${escapeQuery(title)}" AND artist:"${escapeQuery(band.name)}"${type}`;
  const { "release-groups": groups = [] } = await mb("release-group", {
    query,
    limit: "25",
  });

  const wantTitle = norm(title);
  const wantArtist = norm(band.name);

  const candidates = groups
    .map((group) => {
      const nt = norm(group.title);
      const artist = (group["artist-credit"] ?? []).map((a) => norm(a.name)).join("");
      const year = parseInt(group["first-release-date"], 10);
      return {
        group,
        artistOk: Boolean(arid) || artist === wantArtist || artist.includes(wantArtist),
        titleScore: nt === wantTitle ? 2 : nt.endsWith(wantTitle) || nt.startsWith(wantTitle) ? 1 : 0,
        yearDiff: Number.isNaN(year) ? 99 : Math.abs(year - album.year),
      };
    })
    .filter((c) => c.artistOk && c.titleScore > 0)
    .sort(
      (a, b) =>
        b.titleScore - a.titleScore ||
        a.yearDiff - b.yearDiff ||
        b.group.score - a.group.score,
    );

  // An exact title can be a few years off when MusicBrainz dates a later release.
  return candidates.find((c) => c.yearDiff <= 2 || (c.titleScore === 2 && c.yearDiff <= 6)) ?? null;
}

// Editions that add bonus material; avoided so the list matches the album itself.
const BONUS_EDITION = /deluxe|limited|special|bonus|expanded|remaster|anniversary|digipak|digipack|box|japan|2.?cd|reissue/i;
const MAX_DETAIL_FETCHES = 3;

const trackCount = (release) =>
  (release.media ?? []).reduce((sum, m) => sum + (m["track-count"] ?? 0), 0);

/**
 * Official releases of the original standard edition, best first: from the
 * earliest year with a plain (non-bonus) release, the smallest track count
 * (bonus editions only ever add tracks), earliest date first. Counts far below
 * the album's typical size are treated as incomplete entries and skipped.
 */
async function candidateReleases(groupId) {
  const { releases = [] } = await mb("release", {
    "release-group": groupId,
    status: "official",
    inc: "media",
    limit: "100",
  });

  const dated = releases.filter((r) => r.date);
  const isBonus = (r) => BONUS_EDITION.test(`${r.title} ${r.disambiguation ?? ""}`);
  const plain = dated.filter((r) => !isBonus(r));
  const pool = plain.length > 0 ? plain : dated;
  if (pool.length === 0) return [];

  const sorted = pool.map(trackCount).sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length / 2)];
  const complete = pool.filter((r) => trackCount(r) >= typical * 0.6);

  const year = (r) => parseInt(r.date, 10);
  const firstYear = Math.min(...complete.map(year));
  const original = complete.filter((r) => year(r) === firstYear);
  const smallest = Math.min(...original.map(trackCount));

  return original
    .filter((r) => trackCount(r) === smallest)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function readTracks(release) {
  const detail = await mb(`release/${release.id}`, { inc: "recordings" });
  const tracks = (detail.media ?? []).flatMap((medium) =>
    (medium.tracks ?? []).map((track) => ({
      title: track.title,
      seconds: track.length ? Math.round(track.length / 1000) : null,
    })),
  );
  return { detail, tracks };
}

async function fetchTracklist(band, album) {
  const title = TITLE_OVERRIDES[album.id] ?? album.title;
  const match = await findReleaseGroup(band, album, title);
  if (!match) return { error: "no release group within 2 years of our year" };

  const candidates = await candidateReleases(match.group.id);
  if (candidates.length === 0) return { error: `no dated official release in "${match.group.title}"` };

  // Same track count, different pressings: take the first one with track lengths.
  let best = null;
  for (const release of candidates.slice(0, MAX_DETAIL_FETCHES)) {
    const read = await readTracks(release);
    if (read.tracks.length === 0) continue;
    const missing = read.tracks.filter((t) => t.seconds === null).length;
    if (!best || missing < best.missing) best = { ...read, missing };
    if (missing === 0) break;
  }
  if (!best) return { error: "release has no tracks" };

  return {
    entry: {
      mbid: best.detail.id,
      matchedTitle: best.detail.title,
      releaseDate: best.detail.date ?? null,
      tracks: best.tracks,
    },
    yearDiff: match.yearDiff,
    missing: best.missing,
  };
}

const results = JSON.parse(readFileSync(OUT, "utf8"));
const failures = [];
let done = 0;

for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    for (const album of band.albums) {
      if (only ? !only.has(album.id) : !force && results[album.id]) continue;

      let outcome;
      try {
        outcome = await fetchTracklist(band, album);
      } catch (err) {
        outcome = { error: String(err.message ?? err) };
      }
      done++;

      if (outcome.error) {
        failures.push(`${album.id} (${band.name} - ${album.title}, ${album.year}): ${outcome.error}`);
        console.log(`FAIL ${album.id}  ${band.name} - ${album.title} (${album.year}): ${outcome.error}`);
        continue;
      }

      const before = results[album.id]?.tracks.length;
      results[album.id] = outcome.entry;
      writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
      const notes = [];
      if (outcome.yearDiff > 0) notes.push(`year differs by ${outcome.yearDiff}`);
      if (outcome.missing > 0) notes.push(`${outcome.missing} lengths missing`);
      if (before !== undefined && before !== outcome.entry.tracks.length) {
        notes.push(`was ${before} tracks`);
      }
      const note = notes.length > 0 ? `  [${notes.join("; ")}]` : "";
      console.log(
        `ok   ${album.id}  ${band.name} - ${album.title} (${album.year}) -> "${outcome.entry.matchedTitle}" ${outcome.entry.releaseDate}, ${outcome.entry.tracks.length} tracks${note}`,
      );
    }
  }
}

console.log(`\nProcessed ${done} albums, ${failures.length} failed.`);
for (const line of failures) console.log(`  ${line}`);
