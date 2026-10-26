// Shared Wikipedia helpers for the band-lineup scripts.
const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "MetalAtlas/0.1 (personal project)";
const MIN_GAP_MS = 600;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lowercase and drop accents so names compare regardless of diacritics. */
export const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

let lastRequest = 0;
/** One polite call to the MediaWiki API, retrying when it asks us to slow down. */
export async function wiki(params) {
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

/** Wikitext of several pages in one request, following redirects. */
export async function fetchPages(titles) {
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

const DEMONYMS = [
  "American", "British", "English", "Swedish", "Norwegian", "Finnish", "German",
  "Dutch", "Brazilian", "Italian", "Australian", "Swiss", "French", "heavy metal", "metal",
];

/** First year in the infobox's `years_active`, whatever template wraps it. */
export function yearsActiveStart(text) {
  const field = /years[_ ]active\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_ ]+\s*=|\n\}\})/i.exec(text)?.[1] ?? "";
  const year = /\b(?:19|20)\d{2}\b/.exec(field)?.[0];
  return year ? Number(year) : NaN;
}

/** The band's article: a metal musical-artist infobox whose start year is near ours. */
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

export async function findBandPage(band) {
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

/** Wikitext to plain text: no refs, templates or link markup. */
export function cleanWiki(input) {
  let s = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<[^>]+>/g, "");
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = s
      .replace(/\{\{\s*(?:nowrap|small|lang|transl|sort|nobr)\s*\|([^{}]*)\}\}/gi, (_, a) => a.split("|").at(-1))
      .replace(/\{\{[^{}]*\}\}/g, "");
    if (s === before) break;
  }
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
