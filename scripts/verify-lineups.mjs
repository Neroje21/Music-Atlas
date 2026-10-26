// Checks every lineup name in src/data/genres against the band's Wikipedia page.
//
//   npm run verify:lineups                 every band
//   npm run verify:lineups -- --only korn  specific band ids
//
// The lineups were written from memory, so this flags names that don't appear
// on the band's article (a misremembered or misspelt member) and a start year
// that disagrees with the article's infobox. It can't tell whether a name is in
// the right lineup or has the right instrument, so treat a pass as "plausible".
import { subgenres } from "../src/data/mockData.ts";

const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 600;

const args = process.argv.slice(2);
const onlyIdx = args.indexOf("--only");
const only = onlyIdx === -1 ? null : new Set(args[onlyIdx + 1].split(","));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const DEMONYMS = [
  "American", "British", "English", "Swedish", "Norwegian", "Finnish", "German",
  "Dutch", "Brazilian", "Italian", "Australian", "Swiss", "French", "heavy metal", "metal",
];

/** First year in the infobox's `years_active`, whatever template wraps it. */
function yearsActiveStart(text) {
  const field = /years[_ ]active\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_ ]+\s*=|\n\}\})/i.exec(text)?.[1] ?? "";
  const year = /\b(?:19|20)\d{2}\b/.exec(field)?.[0];
  return year ? Number(year) : NaN;
}

async function fetchPages(titles) {
  const res = await wiki({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|"),
    redirects: "1",
  });
  return (res.query?.pages ?? [])
    .filter((p) => !p.missing && !p.invalid && p.revisions?.[0])
    .map((p) => ({ title: p.title, text: p.revisions[0].slots.main.content }));
}

/** The band's article: a musical-artist infobox whose start year is near ours. */
function pickBandPage(pages, band) {
  const wantYear = parseInt(band.activeYears, 10);
  const metal = /heavy metal|thrash|death metal|black metal|doom|metalcore|nu metal|industrial|gothic|folk metal|progressive metal/i;
  const scored = [];
  for (const page of pages) {
    if (!/\{\{\s*Infobox musical artist/i.test(page.text) || !metal.test(page.text)) continue;
    const start = yearsActiveStart(page.text);
    const bare = page.title.replace(/\s*\(.*\)$/, "") === band.name;
    // Closest start year wins. A page with no usable year, or an older one (the
    // band's earlier name), only counts when the title is exactly the band's.
    const diff = Number.isNaN(start) ? 99 : Math.abs(start - wantYear);
    if (diff <= 6 || bare) scored.push({ ...page, start: Number.isNaN(start) ? wantYear : start, diff, bare });
  }
  scored.sort((a, b) => a.diff - b.diff || Number(b.bare) - Number(a.bare));
  return scored[0] ?? null;
}

async function findBandPage(band) {
  const titles = [band.name, `${band.name} (band)`, ...DEMONYMS.map((d) => `${band.name} (${d} band)`)];
  const direct = pickBandPage(await fetchPages(titles), band);
  if (direct) return direct;

  const found = await wiki({
    action: "query",
    list: "search",
    srsearch: `"${band.name}" band`,
    srlimit: "6",
  });
  const hits = (found.query?.search ?? []).map((h) => h.title);
  return hits.length ? pickBandPage(await fetchPages(hits), band) : null;
}

/** Name without the role, nickname quotes or life-span: "Phil "Philthy" Taylor" -> parts. */
function nameParts(entry) {
  const name = entry
    .split(" — ")[0]
    .replace(/\(.*?\)/g, "")
    .replace(/["“”]/g, "")
    .replace(/[.]/g, "")
    .trim();
  return name.split(/\s+/).map(fold).filter(Boolean);
}

function appearsOn(text, parts) {
  if (parts.length === 0) return true;
  if (parts.length === 1) return text.includes(parts[0]);
  const first = escapeRegExp(parts[0]);
  const last = escapeRegExp(parts.at(-1));
  // First and last name close together (allowing a nickname between), either order.
  return new RegExp(`${first}[^\\n]{0,30}?${last}|${last},?\\s+${first}`).test(text);
}

/**
 * The article's list of current members: the infobox `current_members` field
 * plus any "Current members" section. Empty when the page has neither.
 */
function currentMembersText(rawText) {
  const field = /current[_ ]members\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_ ]+\s*=|\n\}\})/i.exec(rawText)?.[1] ?? "";
  const section =
    /={2,4}\s*(?:Current|Present)(?: live| touring)?\s*members?\s*={2,4}([\s\S]*?)(?=\n={2,4}[^=]|$)/i.exec(rawText)?.[1] ?? "";
  return fold(`${field}\n${section}`);
}

let checked = 0;
let flagged = 0;
for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    if (only && !only.has(band.id)) continue;
    checked++;

    let page;
    try {
      page = await findBandPage(band);
    } catch (err) {
      console.log(`ERR   ${band.id}: ${err.message}`);
      continue;
    }
    if (!page) {
      flagged++;
      console.log(`NOPAGE ${band.id}  ${band.name}: no matching Wikipedia article found`);
      continue;
    }

    const text = fold(page.text);
    const missing = [];
    const seen = new Set();
    for (const [which, list] of [["original", band.originalLineup], ["current", band.currentLineup]]) {
      for (const entry of list) {
        const key = entry.split(" — ")[0];
        if (seen.has(key)) continue;
        seen.add(key);
        if (!appearsOn(text, nameParts(entry))) missing.push(`${key} (${which})`);
      }
    }

    // Our "current" names should be in the article's current-members list. Only
    // checked for bands still together, and when the article has such a list.
    const stale = [];
    const current = currentMembersText(page.text);
    if (band.status !== "disbanded" && current.trim().length > 20) {
      for (const entry of band.currentLineup) {
        if (!appearsOn(current, nameParts(entry))) stale.push(entry.split(" — ")[0]);
      }
    }

    const yearNote = Math.abs(page.start - parseInt(band.activeYears, 10)) > 1 ? `  [start year: ours ${parseInt(band.activeYears, 10)}, Wikipedia ${page.start}]` : "";
    if (missing.length > 0 || stale.length > 0 || yearNote) {
      flagged++;
      const parts = [];
      if (missing.length) parts.push(`not on page: ${missing.join(", ")}`);
      if (stale.length) parts.push(`not listed as current: ${stale.join(", ")}`);
      if (stale.length && args.includes("--debug")) {
        const names = [...current.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]);
        const plain = [...current.matchAll(/^\s*\*+\s*([^\n[{]+)/gm)].map((m) => m[1].trim()).filter(Boolean);
        console.log(`      Wikipedia current: ${[...new Set([...names, ...plain])].join(" | ")}`);
      }
      console.log(`CHECK ${band.id}  (${page.title}): ${parts.join("; ") || "all names found"}${yearNote}`);
    } else {
      console.log(`ok    ${band.id}  (${page.title})`);
    }
  }
}
console.log(`\nChecked ${checked} bands, ${flagged} need a look.`);
