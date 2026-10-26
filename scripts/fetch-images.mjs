// Finds a real logo and photo for every band and a cover for every album, and
// records their URLs in src/data/images.json. Nothing is downloaded: the site
// loads the images straight from the services below.
//
//   npm run images                     bands that aren't done yet
//   npm run images -- --force          everything again
//   npm run images -- --only korn,tool specific band ids
//
// Sources:
//   - Band logo and photo: TheAudioDB (free public key), looked up by the band's
//     MusicBrainz id so same-named bands can't be mixed up.
//   - Album cover: Cover Art Archive, found through MusicBrainz release groups;
//     then TheAudioDB by name; then Apple's iTunes Search for what is still missing.
// Anything not found stays a placeholder (see `photo()`, `cover()` and `logo()`
// in src/data/helpers.ts). These are the bands' and labels' images: fine for a
// personal project, but get permission before putting the site online.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";
import { browseReleaseGroups, matchReleaseGroup, norm, sleep } from "./lib/musicbrainz.mjs";

const OUT = fileURLToPath(new URL("../src/data/images.json", import.meta.url));
const LINKS = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/data/streaming-links.json", import.meta.url)), "utf8"),
);

const AUDIODB = "https://www.theaudiodb.com/api/v1/json/123"; // the free key from theaudiodb.com/free_music_api
const AUDIODB_GAP_MS = 2200; // the free tier allows about 30 requests a minute
const USER_AGENT = "MetalAtlas/0.1 (personal project)";

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx === -1 ? null : new Set(args[onlyIdx + 1].split(","));

let lastAudioDb = 0;
async function audioDb(path) {
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastAudioDb + AUDIODB_GAP_MS - Date.now()));
    lastAudioDb = Date.now();
    try {
      const res = await fetch(`${AUDIODB}/${path}`, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 429 && attempt < 5) {
        await sleep(15000 * attempt);
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 4) throw err;
      await sleep(3000 * attempt);
    }
  }
}

/**
 * TheAudioDB's page for a band, by MusicBrainz id. If that page is missing, or
 * has no logo, look the band up by name: the same page can be filed under a
 * different (or no) MusicBrainz id. A name hit counts only if it is the same name
 * and doesn't carry a different MusicBrainz id.
 */
async function findArtist(band, mbid) {
  const byId = (await audioDb(`artist-mb.php?i=${mbid}`))?.artists?.[0] ?? null;
  if (byId?.strArtistLogo) return byId;
  const byName =
    ((await audioDb(`search.php?s=${encodeURIComponent(band.name)}`))?.artists ?? []).find(
      (a) => norm(a.strArtist ?? "") === norm(band.name) && (!a.strMusicBrainzID || a.strMusicBrainzID === mbid),
    ) ?? null;
  return byName?.strArtistLogo || !byId ? (byName ?? byId) : byId;
}

const ITUNES_GAP_MS = 3000; // Apple asks for roughly 20 searches a minute

let lastItunes = 0;
/**
 * Last resort for a cover: Apple's public iTunes Search API (no key). A hit needs
 * the same artist, the same title (ignoring "(Deluxe Edition)"-style suffixes) and
 * a release year within two years of ours.
 */
async function itunesCover(band, album) {
  await sleep(Math.max(0, lastItunes + ITUNES_GAP_MS - Date.now()));
  lastItunes = Date.now();
  const term = encodeURIComponent(`${band.name} ${album.title}`);
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=10`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const { results = [] } = await res.json();
    const bare = (s) => norm(s.replace(/\s*[(\[].*?[)\]]\s*/g, ""));
    const wantArtist = norm(band.name);
    const wantTitle = bare(album.title);
    const hit = results.find((r) => {
      const artist = norm(r.artistName ?? "");
      const sameArtist =
        artist.includes(wantArtist) || wantArtist.includes(artist) || artist.slice(0, 6) === wantArtist.slice(0, 6);
      const title = bare(r.collectionName ?? "");
      const year = parseInt(r.releaseDate ?? "", 10);
      return sameArtist && wantTitle && (title === wantTitle || title.startsWith(wantTitle)) && Math.abs(year - album.year) <= 2;
    });
    const url = hit?.artworkUrl100?.replace("100x100bb", "600x600bb");
    return url && (await isImage(url)) ? url : null;
  } catch {
    return null;
  }
}

/** Does this URL answer with an image? (Follows redirects, sends no body.) */
async function isImage(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

/** The first of these URLs that works, preferring TheAudioDB's smaller `/medium` size. */
async function firstWorking(urls) {
  for (const url of urls.filter(Boolean)) {
    for (const candidate of [`${url}/medium`, url]) {
      if (await isImage(candidate)) return candidate;
    }
  }
  return null;
}

const results = JSON.parse(readFileSync(OUT, "utf8"));
const save = () => writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
const found = { logo: 0, photo: 0, covers: 0, albums: 0 };

for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    if (only ? !only.has(band.id) : !force && results.bands[band.id] && band.albums.every((a) => a.id in results.albums)) {
      continue;
    }

    const mbid = LINKS.bands[band.id]?.mbid;
    if (!mbid) {
      console.log(`MISS ${band.id}: no MusicBrainz id in streaming-links.json (run npm run links first)`);
      continue;
    }

    // Logo and photo.
    let artist = null;
    try {
      artist = await findArtist(band, mbid);
    } catch (err) {
      console.log(`ERR  ${band.id}: TheAudioDB ${err.message}`);
    }
    const entry = {};
    if (artist) {
      const logo = await firstWorking([artist.strArtistLogo]);
      const photo = await firstWorking([
        artist.strArtistFanart,
        artist.strArtistFanart2,
        artist.strArtistFanart3,
        artist.strArtistFanart4,
        artist.strArtistWideThumb,
        artist.strArtistThumb,
      ]);
      if (logo) {
        entry.logo = logo;
        found.logo++;
      }
      if (photo) {
        entry.photo = photo;
        found.photo++;
      }
    }
    results.bands[band.id] = entry;
    save();
    console.log(`band ${band.id}  ${band.name}: logo=${entry.logo ? "yes" : "no"} photo=${entry.photo ? "yes" : "no"}${artist ? "" : "  (not on TheAudioDB)"}`);

    // Album covers.
    let groups = [];
    try {
      groups = await browseReleaseGroups(mbid);
    } catch (err) {
      console.log(`ERR  ${band.id}: MusicBrainz ${err.message}`);
      continue;
    }
    const covers = [];
    for (const album of band.albums) {
      found.albums++;
      const group = matchReleaseGroup(groups, album);
      const url = group ? `https://coverartarchive.org/release-group/${group.id}/front-500` : null;
      const ok = url ? await isImage(url) : false;
      results.albums[album.id] = ok ? { cover: url } : {};
      if (ok) found.covers++;
      covers.push(`${album.title.slice(0, 22)}${ok ? "" : " (none)"}`);
      await sleep(150);
    }
    save();
    console.log(`   covers ${band.albums.filter((a) => results.albums[a.id].cover).length}/${band.albums.length}: ${covers.join(" | ")}`);
  }
}

// Second chance for albums the Cover Art Archive has nothing for: ask TheAudioDB
// for that album by name. (Its free key lists only one album per artist, so this
// can't be the main source, but a direct search works.)
let rescued = 0;
for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    if (only && !only.has(band.id)) continue;
    for (const album of band.albums) {
      if (results.albums[album.id]?.cover) continue;
      let hit = null;
      try {
        const res = await audioDb(
          `searchalbum.php?s=${encodeURIComponent(band.name)}&a=${encodeURIComponent(album.title)}`,
        );
        hit = (res?.album ?? []).find((a) => Math.abs(Number(a.intYearReleased) - album.year) <= 2) ?? null;
      } catch (err) {
        console.log(`ERR  ${album.id}: TheAudioDB ${err.message}`);
      }
      const cover =
        (hit ? await firstWorking([hit.strAlbumThumbHQ, hit.strAlbumThumb]) : null) ??
        (await itunesCover(band, album));
      if (cover) {
        results.albums[album.id] = { cover };
        rescued++;
        save();
      }
      console.log(`   ${cover ? "rescued" : "still none"}: ${band.name} - ${album.title}`);
    }
  }
}

console.log(`\nLogos: ${found.logo}, photos: ${found.photo}, covers: ${found.covers} of ${found.albums} albums, ${rescued} more from TheAudioDB.`);
