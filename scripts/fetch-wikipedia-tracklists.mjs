// Fills src/data/tracklists.json from each album's Wikipedia article.
//
//   npm run tracklists:wiki                      albums not yet filled from Wikipedia
//   npm run tracklists:wiki -- --force           every album, even ones already done
//   npm run tracklists:wiki -- --only death-3    specific album ids
//   npm run tracklists:wiki -- --dry             print what would change, write nothing
//
// Wikipedia is the primary source because its track listings describe the
// original standard edition. MusicBrainz data (fetch-tracklists.mjs) is kept as
// a fallback for albums whose article can't be parsed, and as a cross-check: any
// disagreement is printed so it can be reviewed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";

const OUT = fileURLToPath(new URL("../src/data/tracklists.json", import.meta.url));
const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 600;

// Albums left exactly as they are in tracklists.json. Wikipedia covers
// Dopesmoker and the earlier Jerusalem together, so its list has an extra track
// that isn't on the 2003 release.
const KEEP_AS_IS = new Set([
  "sleep-3",
  // Fixed in tracklists.json: Wikipedia's page for these returns a different
  // release (heidevolk), or lists the discs of a double album twice (him,
  // symphony-x).
  "heidevolk-1",
  "heidevolk-2",
  "him-1",
  "symphony-x-6",
  // Wikipedia's page for these returns a different release or repeats tracks;
  // the MusicBrainz tracklist is used instead.
  "melvins-7",
]);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const verbose = args.includes("--verbose");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx === -1 ? null : new Set(args[onlyIdx + 1].split(","));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

let lastRequest = 0;
async function wiki(params) {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastRequest + MIN_GAP_MS - Date.now()));
    lastRequest = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if ((res.status === 429 || res.status >= 500) && attempt < 8) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep((retryAfter > 0 ? retryAfter : 10 * attempt) * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 8) throw err;
      await sleep(2000 * attempt);
    }
  }
}

// ---- wikitext helpers -------------------------------------------------------

/** The `{{...}}` block starting at `start`, braces balanced. */
function balanced(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") {
      depth++;
      i++;
    } else if (text[i] === "}" && text[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** Template parameters as { key: value }; positional ones are keyed "0", "1"... */
function parseParams(block) {
  const body = block.slice(2, -2);
  const parts = [];
  let braces = 0;
  let brackets = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const pair = body.slice(i, i + 2);
    if (pair === "{{" || pair === "}}" || pair === "[[" || pair === "]]") {
      if (pair === "{{") braces++;
      if (pair === "}}") braces--;
      if (pair === "[[") brackets++;
      if (pair === "]]") brackets--;
      current += pair;
      i++;
    } else if (body[i] === "|" && braces === 0 && brackets === 0) {
      parts.push(current);
      current = "";
    } else {
      current += body[i];
    }
  }
  parts.push(current);

  const params = {};
  let positional = 0;
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq === -1) params[String(positional++)] = part.trim();
    else params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return params;
}

const lastArg = (args) => args.split("|").filter((a) => !a.includes("=")).at(-1) ?? "";

function cleanWiki(input) {
  let s = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  // Unwrap formatting templates, then drop any other (innermost first).
  // Citations can nest several templates deep, so repeat until nothing changes.
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = s
      .replace(/\{\{\s*(?:nowrap|small|lang|transl|sort|sic|nobr|lang-\w+)\s*\|([^{}]*)\}\}/gi, (_, a) => lastArg(a))
      .replace(/\{\{[^{}]*\}\}/g, "");
    if (s === before) break;
  }
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/&(?:nbsp|thinsp|ensp|emsp|hairsp);/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .trim();
}

/** Multi-part tracks are written with bullets: `Title *I. Part *II. Part`. */
function tidyTitle(title) {
  // A lone quote left over from `"Title"` markup.
  if ((title.match(/"/g) ?? []).length === 1) title = title.replace(/^"|"$/g, "");
  if (!/\s\*/.test(title)) return title;
  const [head, ...parts] = title.replace(/"/g, "").split(/\s*\*\s*/);
  return `${head}: ${parts.join(" – ")}`;
}

function parseLength(raw) {
  const m = /(\d+):(\d{2})(?::(\d{2}))?/.exec(cleanWiki(raw ?? ""));
  if (!m) return null;
  const [, a, b, c] = m;
  return c === undefined ? +a * 60 + +b : +a * 3600 + +b * 60 + +c;
}

function headings(text) {
  return [...text.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)].map((m) => ({
    level: m[1].length,
    title: cleanWiki(m[2]),
    start: m.index,
    end: m.index + m[0].length,
  }));
}

// ---- finding the article ----------------------------------------------------

async function getArticle(title) {
  const res = await wiki({ action: "parse", page: title, prop: "wikitext", redirects: "1" });
  if (res.error) return null;
  return { title: res.parse.title, text: res.parse.wikitext };
}

/** Does this article's album infobox match our band and (roughly) our year? */
function matchesAlbum(text, band, album) {
  const start = text.search(/\{\{\s*Infobox album/i);
  if (start === -1) return false;
  const info = parseParams(balanced(text, start));
  const artist = norm(cleanWiki(info.artist ?? ""));
  // Some infoboxes give several release years (original and reissue).
  const released = `${info.released ?? ""} ${info.year ?? ""}`;
  const years = [...released.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  const wantArtist = norm(band.name);
  return (
    (artist.includes(wantArtist) || wantArtist.includes(artist)) &&
    years.some((y) => Math.abs(y - album.year) <= 2)
  );
}

const pages = new Map(); // resolved title -> wikitext
const redirectsTo = new Map(); // a requested title -> the title it redirects/normalises to
const asked = new Set(); // titles already requested

/** Where an album's article is likely to live, most specific title first. */
function candidateTitles(band, album) {
  const out = [];
  const titleCased = album.title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  for (const t of new Set([album.title, album.title.replace(/…/g, "..."), titleCased])) {
    out.push(`${t} (${band.name} album)`, `${t} (${album.year} album)`, `${t} (album)`, t);
  }
  return [...new Set(out)];
}

/**
 * Loads all these candidate pages at once (50 titles per request), so a band's
 * whole discography costs one or two requests instead of one per album.
 */
async function prefetch(titles) {
  const todo = [...new Set(titles)].filter((t) => !asked.has(t));
  for (let i = 0; i < todo.length; i += 50) {
    const chunk = todo.slice(i, i + 50);
    for (const t of chunk) asked.add(t);

    let cont = {};
    do {
      const res = await wiki({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        titles: chunk.join("|"),
        redirects: "1",
        ...cont,
      });
      for (const m of [...(res.query?.normalized ?? []), ...(res.query?.redirects ?? [])]) {
        redirectsTo.set(m.from, m.to);
      }
      for (const p of res.query?.pages ?? []) {
        if (!p.missing && !p.invalid && p.revisions?.[0]) {
          pages.set(p.title, p.revisions[0].slots.main.content);
        }
      }
      cont = res.continue;
    } while (cont);
  }
}

function resolveTitle(title) {
  let t = title;
  for (let i = 0; i < 4 && redirectsTo.has(t); i++) t = redirectsTo.get(t);
  return t;
}

async function findArticle(band, album) {
  for (const title of candidateTitles(band, album)) {
    const resolved = resolveTitle(title);
    const text = pages.get(resolved);
    if (text && matchesAlbum(text, band, album)) return { title: resolved, text };
  }

  // Fall back to search.
  const found = await wiki({
    action: "query",
    list: "search",
    srsearch: `"${album.title}" ${band.name} album`,
    srlimit: "5",
  });
  for (const hit of found.query?.search ?? []) {
    const article = await getArticle(hit.title);
    if (article && matchesAlbum(article.text, band, album)) return article;
  }
  return null;
}

// ---- reading the track listing ----------------------------------------------

// Labels that mean "not the original standard edition".
const EXTRA = /bonus|2-?cd|\bep\b|earbook|digipak|digipack|digi-?book|mediabook|only (?:featured|available|included|on)|re-?issue|re-?master|deluxe|anniversary|expanded|collector|japan|digital|demo|outtake|b-side|additional|extra|limited|special|north america|american|re-?release|box set|dvd|bootleg|\blive\b|picture disc|streaming|disc (?:three|3)|cd (?:three|3)/i;
const KEEP = /standard|original|regular/i;
// A listing under a different subheading still continues the album when that
// subheading is just another side or disc ("Side two", "Disc 2", "CD two").
const CONTINUES = /^(?:side|disc|disk|cd|lp|record|vinyl|part)\b/i;

// "Standard edition" outranks an edition word, but only in a short label, not in
// a long sentence that happens to say "original".
// "US" only counts in capitals, so a title ending in "Us" isn't taken for a US edition.
const isExtra = (label) =>
  (EXTRA.test(label) || /\b(?:US|U\.S\.)(?!\w)/.test(label)) && !(label.length <= 40 && KEEP.test(label));
// A note after a listing marks it as extra only when it points back at those
// tracks ("These last three songs are only on the earbook edition"). A general
// remark about other pressings ("Note: the 1986 CD added a bonus track") doesn't.
const EXTRA_NOTE = /only (?:featured|available|included|on)|earbook|digipak|digipack|digi-?book|mediabook|limited edition|bonus (?:disc|cd|tracks?)/i;
const POINTS_BACK = /^[\s*:;-]*(?:these|this|the last|the final)\b[^.]{0,30}\b(?:tracks?|songs?)\b/i;
const isExtraNote = (note) => EXTRA_NOTE.test(note) && POINTS_BACK.test(note);

// Albums whose Wikipedia listing runs the standard tracks straight into a
// second version (a bonus disc, a Swedish-language edition): keep only the first N.
const TRACK_LIMITS = {
  "opeth-8": 10, // English version; the Swedish version follows it
  "slipknot-7": 12, // repeated for a second disc
  "ministry-5": 11, // followed by a "Redux" version of the album
  "judas-priest-7": 14, // then two bonus tracks
  "epica-8": 12, // then four bonus tracks
  "linkin-park-4": 15, // then the Full Experience edition and its extras
  "amaranthe-1": 12, // then bonus tracks and the DVD
  "amaranthe-2": 12,
  "amaranthe-3": 12,
  "amaranthe-5": 13,
  "amaranthe-6": 12,
  "kmfdm-3": 11, // then the same tracks again
  "staind-1": 10,
  "pod-6": 12,
  "august-burns-red-6": 12,
  "sonata-arctica-5": 13,
  "at-the-gates-3": 10,
  "marduk-6": 11,
  "heaven-shall-burn-7": 13, // then a bonus disc
  "sex-pistols-2": 25, // then the same soundtrack in other versions
  "the-smashing-pumpkins-8": 33, // three acts of eleven, then extras
  "the-boo-radleys-4": 15, // then the B-sides and a second listing
  "van-halen-8": 13,
  "the-darkness-4": 14,
  "tame-impala-4": 12, // then bonus tracks
  "the-mars-volta-2": 5, // the five long tracks; the rest are their movements
  "wire-5": 10, // then CD bonus tracks
  "muse-7": 12,
  "gene-2": 12,
  "fall-out-boy-7": 10,
};

// Hand fixes applied after parsing: album id -> { 1-based track number: title }.
const TRACK_TITLE_FIXES = {
  // Wikipedia lists "Seasons" twice; the last is the acoustic version.
  "dragonforce-5": { 10: "Seasons (acoustic version)" },
  "eagles-5": { 5: "Wasted Time (Reprise)" },
  "styx-7": { 9: "Don't Let It End (Reprise)" },
};

function extractTracks(text) {
  const all = headings(text);
  const section = all.find((h) => h.level === 2 && /^track\s*-?\s*list/i.test(h.title));
  let from = 0;
  let to = text.length;
  if (section) {
    from = section.end;
    to = all.find((h) => h.level === 2 && h.start > section.start)?.start ?? text.length;
  }

  const blocks = [];
  const re = /\{\{\s*(?:track\s*listing|tracklist)\b/gi;
  re.lastIndex = from;
  for (let m = re.exec(text); m && m.index < to; m = re.exec(text)) {
    const block = balanced(text, m.index);
    // Only subheadings inside the track listing count as labels.
    const heading = [...all].reverse().find((h) => h.start < m.index && h.start >= from && h.level >= 3);
    blocks.push({
      params: parseParams(block),
      heading: heading?.title ?? "",
      start: m.index,
      end: m.index + block.length,
      lead: "", // a label line before the listing ("Bonus tracks")
      after: "", // a note after it ("Only on the earbook edition.")
    });
    re.lastIndex = m.index + block.length;
  }

  // The first line of prose after each listing is either a note about that
  // listing (a bullet or a sentence) or a label for the next one.
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    const raw = text.slice(b.end, next ? next.start : to).split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    const line = cleanWiki(raw);
    if (!line || line.length > 300 || /^[=}{]/.test(raw)) return;
    if (raw.startsWith("*") || /[.!?]$/.test(line)) b.after = line;
    else if (next) next.lead = line;
  });

  const tracks = [];
  let started = false;
  let previous = null;
  for (const { params, heading, lead, after } of blocks) {
    const headline = cleanWiki(params.headline ?? "");
    const labels = [heading, headline].filter(Boolean);
    // A note after the very first listing usually just describes the album, so
    // it only counts once we've started collecting.
    const extra =
      [...labels, lead].some((l) => l && isExtra(l)) || (started && isExtraNote(after));
    if (verbose) console.log(`       block heading=[${heading}] headline=[${headline}] lead=[${lead.slice(0, 50)}] after=[${after.slice(0, 50)}] extra=${extra}`);

    if (started) {
      // Same subheading (or none): the album carries on across sides, discs or
      // parts, whatever each listing's own headline says. A new subheading only
      // continues it if it is itself a side or disc.
      const continues =
        !extra && (heading === previous.heading || CONTINUES.test(heading));
      if (!continues) break;
    } else if (extra) {
      continue;
    }

    const numbers = Object.keys(params)
      .map((k) => /^title(\d+)$/.exec(k)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
    for (const n of numbers) {
      const title = tidyTitle(cleanWiki(params[`title${n}`] ?? ""));
      if (title) tracks.push({ title, seconds: parseLength(params[`length${n}`]) });
    }
    started = tracks.length > 0;
    previous = { heading };
  }
  return tracks;
}

// ---- main -------------------------------------------------------------------

const results = JSON.parse(readFileSync(OUT, "utf8"));
const summary = { wikipedia: 0, fallback: 0, differs: [] };

for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    // Albums already filled from Wikipedia are skipped unless --force or --only.
    const wanted = band.albums.filter(
      (a) =>
        !KEEP_AS_IS.has(a.id) &&
        (only ? only.has(a.id) : force || results[a.id]?.source !== "wikipedia"),
    );
    if (wanted.length === 0) continue;
    await prefetch(wanted.flatMap((a) => candidateTitles(band, a)));

    for (const album of wanted) {

      const before = results[album.id];
      let article = null;
      let tracks = [];
      try {
        article = await findArticle(band, album);
        if (article) tracks = extractTracks(article.text);
      } catch (err) {
        console.log(`ERR  ${album.id}: ${err.message}`);
      }

      if (tracks.length === 0) {
        summary.fallback++;
        console.log(`KEEP ${album.id}  ${band.name} - ${album.title}: ${article ? "no parsable listing in " + article.title : "no Wikipedia article"}; keeping ${before?.source ?? "musicbrainz"} data`);
        if (before && !before.source) before.source = "musicbrainz";
        continue;
      }

      // A second edition listed after the first starts over at track 1.
      const first = norm(tracks[0].title);
      const restart = first ? tracks.findIndex((t, i) => i >= 4 && norm(t.title) === first) : -1;
      if (restart !== -1) tracks.length = restart;

      if (TRACK_LIMITS[album.id]) tracks.length = Math.min(tracks.length, TRACK_LIMITS[album.id]);

      for (const [number, title] of Object.entries(TRACK_TITLE_FIXES[album.id] ?? {})) {
        if (tracks[number - 1]) tracks[number - 1].title = title;
      }

      // Lengths Wikipedia lacks can come from MusicBrainz, matched by title.
      const mbLengths = new Map((before?.tracks ?? []).map((t) => [norm(t.title), t.seconds]));
      for (const track of tracks) {
        if (track.seconds === null) track.seconds = mbLengths.get(norm(track.title)) ?? null;
      }

      const wikiTitles = tracks.map((t) => norm(t.title));
      const mbTitles = (before?.tracks ?? []).map((t) => norm(t.title));
      const same = wikiTitles.length === mbTitles.length && wikiTitles.every((t, i) => t === mbTitles[i]);
      summary.wikipedia++;
      const tag = same ? "same " : "DIFF ";
      console.log(`${tag}${album.id}  ${band.name} - ${album.title}: "${article.title}" ${tracks.length} tracks (MusicBrainz had ${mbTitles.length})`);
      if (!same) {
        summary.differs.push(album.id);
        const onlyWiki = tracks.filter((t) => !mbTitles.includes(norm(t.title))).map((t) => t.title);
        const onlyMb = (before?.tracks ?? []).filter((t) => !wikiTitles.includes(norm(t.title))).map((t) => t.title);
        if (onlyWiki.length) console.log(`       only on Wikipedia: ${onlyWiki.join(" | ")}`);
        if (onlyMb.length) console.log(`       only on MusicBrainz: ${onlyMb.join(" | ")}`);
      }

      results[album.id] = { source: "wikipedia", page: article.title, tracks };
      if (!dry) writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
    }
  }
}

console.log(`\nWikipedia: ${summary.wikipedia}, kept MusicBrainz: ${summary.fallback}, differing from MusicBrainz: ${summary.differs.length}${dry ? " (dry run, nothing written)" : ""}`);
