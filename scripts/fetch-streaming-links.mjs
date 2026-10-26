// Fills src/data/streaming-links.json with direct Spotify / YouTube Music URLs
// for every band and album, read from MusicBrainz's URL relationships.
//
//   npm run links                    bands and albums that have no entry yet
//   npm run links -- --force         refetch everything
//   npm run links -- --only death    specific band ids (their albums too)
//
// Only direct links are stored. Anything missing falls back to a search URL in
// mockData.ts, so gaps here never produce a broken link. MusicBrainz asks for at
// most one request per second, so a full run takes a few minutes.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";

const OUT = fileURLToPath(new URL("../src/data/streaming-links.json", import.meta.url));
const BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 1100;

// MusicBrainz country codes for the countries used in src/data/genres.
const COUNTRY_CODES = {
  "United States": "US",
  "United Kingdom": "GB",
  Norway: "NO",
  Sweden: "SE",
  Finland: "FI",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Switzerland: "CH",
  Italy: "IT",
  Brazil: "BR",
  Australia: "AU",
  Denmark: "DK",
  Canada: "CA",
  Poland: "PL",
  Greece: "GR",
  Portugal: "PT",
  Austria: "AT",
  Israel: "IL",
  Ireland: "IE",
  "Faroe Islands": "FO",
  Iceland: "IS",
  "New Zealand": "NZ",
};

// Bands the name/country/year matcher cannot pick: MusicBrainz leaves out the
// country, or dates the artist differently from us.
const ARTIST_OVERRIDES = {
  powerwolf: "3ef77bdc-b1ce-4e44-aa4b-acfa763c5284",
  gloryhammer: "85997032-ff48-4383-b86a-a920d4230a0b",
  kalmah: "8d5291bc-e960-428a-9004-b5ab9c171dd2",
  "witchfinder-general": "89618a45-ff4a-4e5f-942e-3ef93c8c555c",
  "pain-of-salvation": "f7c65346-9631-4220-9188-5e90baae58d5",
  moonsorrow: "98fb7792-01fa-4ed1-a15d-20077a47210f",
  "rob-zombie": "c995a379-60b9-404b-bd97-a7e2de0751d3",
  kmfdm: "45074d7c-5307-44a8-854f-ae072e1622ae",
  filter: "6ae51665-8261-4ae5-883f-1899651ad31b",
  "bullet-for-my-valentine": "d530dbf9-69b1-404f-98f2-0431104f5a1e",
  // Rock Atlas
  "creedence-clearwater-revival": "109958eb-a335-4c5e-907e-597ff4c6af46",
  boston: "0d8b0d50-e4cf-4da4-965d-f24c58ec3268",
  "pink-floyd": "83d91898-7763-47d7-b03b-b92132375c47",
  "the-13th-floor-elevators": "1964494f-9f1a-41c1-b054-80ef3b95025c",
  "tame-impala": "63aa26c3-d59b-4da4-84ac-716b54f1ef4d",
  "the-outlaws": "e1a01561-204f-49aa-8e9d-12d5d39564e1",
  "the-black-crowes": "02ceff75-7363-493e-a78d-912dc86c7460",
  "the-black-lips": "e940d7a3-01d0-468c-86ea-5dc4d89dcf80",
  "the-vines": "4e045c96-538b-46ed-8ea8-7cae20b56574",
  "the-datsuns": "7a5bcae1-45e5-495b-9f5b-254987b364bf",
  rancid: "24f8d8a5-269b-475c-a1cb-792990b0b2ee",
  radiohead: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
  placebo: "847e8284-8582-4b0e-9c26-b042a4f49e57",
  "modest-mouse": "a96ac800-bfcb-412a-8a63-0a98df600700",
  "yo-la-tengo": "3f542031-b054-454d-b57b-812fa2a81b11",
  "cocteau-twins": "000fc734-b7e1-4a01-92d1-f544261b43f5",
  "the-cure": "69ee3720-a7cb-4402-b48d-a02c366f2bcf",
  // Added later: no country on MusicBrainz, or listed as a person.
  kanonenfieber: "b0016af8-3953-47ce-b865-475a770d7b17",
  "violent-vira": "b90bf88d-53bf-4257-a151-95d9848fd90c",
};

const SPOTIFY_ARTIST = /^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+/;
const SPOTIFY_ALBUM = /^https:\/\/open\.spotify\.com\/album\/[A-Za-z0-9]+/;
const YT_MUSIC = /^https:\/\/music\.youtube\.com\/(?:channel|browse|playlist)/;

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

const urlsOf = (entity) => (entity.relations ?? []).map((r) => r.url?.resource).filter(Boolean);

/** The most common URL matching `pattern` across these URL lists. */
function mostCommon(urlLists, pattern) {
  const counts = new Map();
  for (const list of urlLists) {
    for (const url of new Set(list.filter((u) => pattern.test(u)))) {
      counts.set(url, (counts.get(url) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Match our band to a MusicBrainz artist by name, country and start year. */
async function findArtist(band) {
  if (ARTIST_OVERRIDES[band.id]) return { id: ARTIST_OVERRIDES[band.id], name: band.name };

  const wantYear = parseInt(band.activeYears, 10);
  const { artists = [] } = await mb("artist", {
    query: `artist:"${escapeQuery(band.name)}"`,
    limit: "25",
  });
  const sameNameAndCountry = artists
    .filter((a) => norm(a.name) === norm(band.name) && a.country === COUNTRY_CODES[band.country])
    .map((a) => {
      const begin = parseInt(a["life-span"]?.begin ?? "", 10);
      return { artist: a, yearDiff: Number.isNaN(begin) ? 50 : Math.abs(begin - wantYear) };
    });

  const closeInTime = sameNameAndCountry
    .filter((m) => m.yearDiff <= 3)
    .sort((a, b) => a.yearDiff - b.yearDiff || b.artist.score - a.artist.score);
  if (closeInTime.length > 0) return closeInTime[0].artist;

  // A band that changed its name (formed as Burn the Priest, say) can start years
  // away from our date. Accept it if it is the only metal act with that name.
  const metal = sameNameAndCountry.filter((m) => /metal|hardcore|groove|thrash/i.test(m.artist.disambiguation ?? ""));
  return metal.length === 1 ? metal[0].artist : null;
}

async function browseReleaseGroups(artistId) {
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

function matchReleaseGroup(groups, album) {
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
    .filter((c) => c.titleScore > 0 && c.yearDiff <= 2)
    .sort((a, b) => b.titleScore - a.titleScore || Number(b.plain) - Number(a.plain) || a.yearDiff - b.yearDiff)[0]?.group;
}

const results = JSON.parse(readFileSync(OUT, "utf8"));
const save = () => writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
const found = { bandSpotify: 0, bandYtm: 0, albumSpotify: 0, albumYtm: 0, albums: 0 };

for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    if (only && !only.has(band.id)) continue;
    const bandDone = results.bands[band.id] && band.albums.every((a) => results.albums[a.id]);
    if (!force && !only && bandDone) continue;

    let artist;
    try {
      artist = await findArtist(band);
    } catch (err) {
      console.log(`ERR  ${band.id}: ${err.message}`);
      continue;
    }
    if (!artist) {
      console.log(`MISS ${band.id}  ${band.name}: no MusicBrainz artist with that name, country and start year`);
      continue;
    }

    const detail = await mb(`artist/${artist.id}`, { inc: "url-rels" });
    const bandLinks = { mbid: artist.id };
    const spotify = urlsOf(detail).find((u) => SPOTIFY_ARTIST.test(u));
    const youtubeMusic = urlsOf(detail).find((u) => YT_MUSIC.test(u));
    if (spotify) {
      bandLinks.spotify = spotify;
      found.bandSpotify++;
    }
    if (youtubeMusic) {
      bandLinks.youtubeMusic = youtubeMusic;
      found.bandYtm++;
    }
    results.bands[band.id] = bandLinks;
    save();
    console.log(`band ${band.id}  ${band.name}: "${artist.name}" (${artist.country}, ${artist["life-span"]?.begin ?? "?"}${artist.disambiguation ? ", " + artist.disambiguation : ""})  spotify=${spotify ? "yes" : "no"} ytmusic=${youtubeMusic ? "yes" : "no"}`);

    const groups = await browseReleaseGroups(artist.id);
    for (const album of band.albums) {
      found.albums++;
      const group = matchReleaseGroup(groups, album);
      if (!group) {
        console.log(`   no release group for ${album.id}  ${album.title} (${album.year})`);
        continue;
      }
      const { releases = [] } = await mb("release", {
        "release-group": group.id,
        inc: "url-rels",
        limit: "100",
      });
      const lists = releases.map(urlsOf);
      const albumLinks = {};
      const aSpotify = mostCommon(lists, SPOTIFY_ALBUM);
      const aYtm = mostCommon(lists, YT_MUSIC);
      if (aSpotify) {
        albumLinks.spotify = aSpotify;
        found.albumSpotify++;
      }
      if (aYtm) {
        albumLinks.youtubeMusic = aYtm;
        found.albumYtm++;
      }
      results.albums[album.id] = albumLinks;
      save();
      console.log(`   ${album.id}  ${album.title}: spotify=${aSpotify ? "yes" : "no"} ytmusic=${aYtm ? "yes" : "no"}`);
    }
  }
}

console.log(`\nBands with Spotify: ${found.bandSpotify}, YouTube Music: ${found.bandYtm}. Albums (${found.albums}) with Spotify: ${found.albumSpotify}, YouTube Music: ${found.albumYtm}.`);
