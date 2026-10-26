// Fills src/data/lineups.json with each active band's current lineup, read from
// the "current members" list on its Wikipedia article.
//
//   npm run lineups                  every band that hasn't split up
//   npm run lineups -- --only korn   specific band ids
//   npm run lineups -- --dry         print only, write nothing
//
// Who is in a band today changes faster than a hand-written list can keep up,
// so helpers.ts prefers this file over the `currentLineup` typed in each genre
// file. Bands with no usable list on Wikipedia keep their hand-written lineup.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { subgenres } from "../src/data/mockData.ts";
import { cleanWiki, findBandPage, fold } from "./lib/wikipedia.mjs";

const OUT = fileURLToPath(new URL("../src/data/lineups.json", import.meta.url));
// Bands whose Wikipedia lists can't be read reliably; their hand-written
// lineup in src/data/genres is used instead.
const SKIP = new Set([
  "ministry", // the infobox member list runs straight into the discography
  "marduk", // the page's timeline template is read as members
  "slipknot", // the unidentified touring sampler is only in the Touring section
  "interpol", // roles come back glued onto the names
  "boston", // the page search finds Aerosmith
  "the-darkness", // the page search finds an unrelated band
]);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx === -1 ? null : new Set(args[onlyIdx + 1].split(","));

/** Bullet names ("* Name – role") in a chunk of wikitext, as displayed. */
function bulletNames(chunk) {
  const names = [];
  for (const line of chunk.split("\n")) {
    const item = /^\s*(?:\{\{[^|]*\|)?\s*\*+\s*(.+)$/.exec(line)?.[1];
    if (!item) continue;
    // Clean first so "[[Link (disambig)|Display]]" becomes "Display", then keep the
    // part before a dash or parenthesis: "Name – role (years)".
    const name = cleanWiki(item)
      .split(/\s[–—-]\s|\s\(/)[0]
      .replace(/[{}[\]]+/g, "")
      .trim();
    if (name) names.push(name);
  }
  return names;
}

/**
 * Current members: the infobox's `current_members` field first, then anyone
 * listed under a "Current members" heading. The infobox is sometimes partial and
 * the section sometimes missing, so each fills gaps in the other.
 */
function currentMembers(text) {
  const field = /current[_ ]members\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_ ]+\s*=|\n\}\})/i.exec(text)?.[1] ?? "";
  // Infoboxes mix bullets with plain links ({{hlist}}, one name per line...), so
  // take both and let the de-duplication below sort it out.
  const linked = [...field.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g)]
    .map((m) => cleanWiki(m[2] ?? m[1]).replace(/\s*\(.*\)$/, "").trim())
    .filter((n) => n && !/discography|band$/i.test(n));
  // Names separated by <br /> or plain line breaks, with or without links.
  const separated = field
    .split(/<br\s*\/?>|\n/i)
    .map((chunk) =>
      cleanWiki(chunk)
        .replace(/^[*#:\s]+/, "")
        .split(/\s[–—-]\s|\s\(/)[0]
        .replace(/[{}[\]]+/g, "")
        .trim(),
    )
    .filter(Boolean);
  const fromInfobox = [...bulletNames(field), ...linked, ...separated];
  const section =
    /={2,4}\s*(?:Current|Present)\s*members?\s*={2,4}([\s\S]*?)(?=\n={2,4}[^=])/i.exec(text)?.[1] ?? "";

  const seen = new Set();
  const names = [];
  for (const name of [...fromInfobox, ...bulletNames(section)]) {
    const key = nameKey(name);
    // Footnotes and album lists sometimes sit in the same list; a name is short.
    const looksLikeName =
      name.length <= 40 &&
      name.split(/\s+/).length <= 5 &&
      !/[|=]/.test(name) &&
      !/releases|sessions|\blive\b|album|discography|\bfrom\b|plainlist|hlist|flatlist|collapsible/i.test(name);
    if (looksLikeName && key.length > 3 && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

/** Compare names without accents, case or nicknames: Phil "Philthy" Taylor ~ Phil Taylor. */
const nameKey = (s) => fold(s).replace(/"[^"]*"/g, "").replace(/\s+/g, " ").trim();

/**
 * The page's bullet line for this member, e.g. "* Name – lead vocals (1990–present)":
 * the name as the article writes it (nickname included) and the role.
 */
function memberLine(name, text) {
  const key = nameKey(name);
  for (const line of text.split("\n")) {
    if (!/^\s*[*:#]/.test(line)) continue;
    const parts = cleanWiki(line.replace(/^\s*[*:#]+/, "")).split(/\s[–—-]\s/);
    const head = nameKey(parts[0]);
    if (head !== key && !head.startsWith(`${key} `)) continue;
    const role = parts.slice(1).join(" – ").split(/[(;]/)[0].trim().replace(/[,.]$/, "");
    if (role) {
      // "Fenriz (Gylve Fenris Nagell)" -> "Fenriz": drop real-name parentheses.
      const display = parts[0].replace(/[{}[\]]+/g, "").replace(/\s*\([^)]*\)/g, "").trim();
      return { display, role: role.charAt(0).toUpperCase() + role.slice(1) };
    }
  }
  return null;
}

const results = JSON.parse(readFileSync(OUT, "utf8"));
let updated = 0;
let kept = 0;

for (const subgenre of subgenres) {
  for (const band of subgenre.bands) {
    if (only ? !only.has(band.id) : band.status === "disbanded") continue;
    if (SKIP.has(band.id)) {
      delete results[band.id];
      continue;
    }

    let page;
    try {
      page = await findBandPage(band);
    } catch (err) {
      console.log(`ERR  ${band.id}: ${err.message}`);
      continue;
    }
    const names = page ? currentMembers(page.text) : [];
    if (!page || names.length < 2) {
      kept++;
      console.log(`KEEP ${band.id}  ${band.name}: ${page ? `only ${names.length} current member(s) listed` : "no article"}; keeping the hand-written lineup`);
      delete results[band.id];
      continue;
    }

    const lineup = names.map((name) => {
      const found = memberLine(name, page.text);
      return found ? `${found.display} — ${found.role}` : name;
    });
    results[band.id] = { source: page.title, current: lineup };
    updated++;
    console.log(`ok   ${band.id}  (${page.title})\n       ${lineup.join("\n       ")}`);
  }
}

if (!dry) writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
console.log(`\nUpdated ${updated} band(s), kept ${kept} hand-written${dry ? " (dry run, nothing written)" : ""}.`);
