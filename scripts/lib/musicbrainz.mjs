// Shared MusicBrainz helpers for the image and link scripts.
const BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 1100;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lowercase letters and digits only, accents removed. */
export const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

let lastRequest = 0;
/** One request to the MusicBrainz API, at most one per second, retrying on 503. */
export async function mb(path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set("fmt", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_GAP_MS - Date.now()));
    lastRequest = Date.now();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if ((res.status === 503 || res.status === 429) && attempt < 6) {
        await sleep(3000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(2000 * attempt);
    }
  }
}

/** Every album-type release group an artist has. */
export async function browseReleaseGroups(artistId) {
  const groups = [];
  for (let offset = 0; ; offset += 100) {
    const page = await mb("release-group", {
      artist: artistId,
      type: "album",
      limit: "100",
      offset: String(offset),
    });
    groups.push(...(page["release-groups"] ?? []));
    if (offset + 100 >= (page["release-group-count"] ?? 0)) break;
  }
  return groups;
}

/** The release group that best matches one of our albums by title and year. */
export function matchReleaseGroup(groups, album) {
  const wantTitle = norm(album.title);
  return groups
    .map((group) => {
      const nt = norm(group.title);
      const year = parseInt(group["first-release-date"] ?? "", 10);
      return {
        group,
        titleScore: nt === wantTitle ? 2 : nt.endsWith(wantTitle) || nt.startsWith(wantTitle) ? 1 : 0,
        plain: (group["secondary-types"] ?? []).length === 0,
        yearDiff: Number.isNaN(year) ? 99 : Math.abs(year - album.year),
      };
    })
    // An exact title can be a few years off (MusicBrainz dates some albums by a
    // later release); a partial title has to match the year closely.
    .filter((c) => c.titleScore > 0 && (c.yearDiff <= 2 || (c.titleScore === 2 && c.yearDiff <= 6)))
    .sort((a, b) => b.titleScore - a.titleScore || Number(b.plain) - Number(a.plain) || a.yearDiff - b.yearDiff)[0]?.group;
}
