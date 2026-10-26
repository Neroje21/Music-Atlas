import { subgenres } from "@/data/mockData";
import type { AccentName, AtlasId } from "@/types/metal";

export interface SearchResult {
  kind: "subgenre" | "band";
  /** Which atlas it belongs to, so unscoped searches can say so. */
  atlas: AtlasId;
  id: string;
  title: string;
  subtitle: string;
  /** Why a band matched when it wasn't by name, e.g. "Album: Human". */
  matchedOn: string | null;
  accent: AccentName;
  href: string;
  score: number;
}

interface Field {
  /** Shown when this field is why the item matched ("" for the name itself). */
  label: string;
  text: string;
  weight: number;
}

interface Entry {
  meta: Omit<SearchResult, "matchedOn" | "score">;
  fields: Field[];
}

/** Lowercase and drop accents, so "Kursch" finds "Kürsch". */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const memberName = (entry: string) => entry.split(" — ")[0];

const entries: Entry[] = subgenres.flatMap((subgenre): Entry[] => [
  {
    meta: {
      kind: "subgenre",
      atlas: subgenre.atlas,
      id: subgenre.id,
      title: subgenre.name,
      subtitle: `${subgenre.bands.length} bands · ${subgenre.tagline}`,
      accent: subgenre.accent,
      href: `/${subgenre.atlas}/genre/${subgenre.slug}`,
    },
    fields: [
      { label: "", text: subgenre.name, weight: 100 },
      { label: "", text: subgenre.tagline, weight: 8 },
    ],
  },
  ...subgenre.bands.map((band): Entry => {
    const members = new Set(
      [...band.originalLineup, ...band.currentLineup].map(memberName),
    );
    return {
      meta: {
        kind: "band",
        atlas: subgenre.atlas,
        id: band.id,
        title: band.name,
        subtitle: `${band.country} · ${band.activeYears} · ${subgenre.name}`,
        accent: subgenre.accent,
        href: `/${subgenre.atlas}/genre/${subgenre.slug}?band=${band.id}`,
      },
      fields: [
        { label: "", text: band.name, weight: 100 },
        { label: "Country", text: band.country, weight: 30 },
        ...band.vibeTags.map((tag) => ({ label: "Vibe", text: tag, weight: 25 })),
        ...[...members].map((m) => ({ label: "Member", text: m, weight: 25 })),
        ...band.albums.map((a) => ({ label: "Album", text: a.title, weight: 20 })),
        { label: "Subgenre", text: subgenre.name, weight: 30 },
      ],
    };
  }),
]);

/** How well one query word matches one field: word starts > appears inside. */
function scoreToken(token: string, text: string, weight: number) {
  const folded = fold(text);
  if (folded === token) return weight * 1.5;
  if (folded.startsWith(token)) return weight * 1.2;
  if (folded.split(/[^a-z0-9]+/).some((word) => word.startsWith(token))) return weight;
  if (folded.includes(token)) return weight * 0.6;
  return 0;
}

/**
 * Every word of the query must match something. Subgenres and bands come back
 * ranked together by score, capped so the list stays short. Pass `atlas` to
 * search just that atlas.
 */
export function search(query: string, atlas?: AtlasId | null, limit = 9): SearchResult[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const phrase = tokens.join(" ");

  const results: SearchResult[] = [];
  for (const { meta, fields } of entries) {
    if (atlas && meta.atlas !== atlas) continue;
    let score = 0;
    let matchedOn: string | null = null;
    let matchedWeight = 0;

    for (const token of tokens) {
      let best = 0;
      let bestField: Field | null = null;
      for (const field of fields) {
        const s = scoreToken(token, field.text, field.weight);
        if (s > best) {
          best = s;
          bestField = field;
        }
      }
      if (best === 0) {
        score = 0;
        break;
      }
      score += best;
      // Remember the strongest reason that isn't the name, to show under it.
      if (bestField?.label && best > matchedWeight) {
        matchedWeight = best;
        matchedOn = `${bestField.label}: ${bestField.text}`;
      }
    }

    // Typing a whole phrase ("nu metal") should favour things that contain it
    // as written over things that merely match each word somewhere.
    if (score > 0 && tokens.length > 1) {
      const whole = fields.filter((f) => fold(f.text).includes(phrase));
      if (whole.length > 0) score += Math.max(...whole.map((f) => f.weight)) * 2;
    }

    if (score > 0) {
      // A name hit makes the extra reason redundant.
      const nameHit = tokens.every((t) => fold(meta.title).includes(t));
      results.push({ ...meta, matchedOn: nameHit ? null : matchedOn, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/** What to show before anything is typed: the subgenres of the atlas (or all). */
export function suggestions(atlas?: AtlasId | null): SearchResult[] {
  return entries
    .filter((e) => e.meta.kind === "subgenre" && (!atlas || e.meta.atlas === atlas))
    .map((e) => ({ ...e.meta, matchedOn: null, score: 0 }));
}
