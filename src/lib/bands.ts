import type { HeroBand } from "@/components/HeroBandOfTheDay";
import { subgenres } from "@/data/mockData";
import type { AccentName, AtlasId, Band, Subgenre } from "@/types/metal";

/** Every band of every atlas; ids are unique across them. */
export const allBands: Band[] = subgenres.flatMap((s) => s.bands);

export function getAtlasSubgenres(atlas: AtlasId): Subgenre[] {
  return subgenres.filter((s) => s.atlas === atlas);
}

export function getAtlasBands(atlas: AtlasId): Band[] {
  return getAtlasSubgenres(atlas).flatMap((s) => s.bands);
}

export function getSubgenreBySlug(atlas: AtlasId, slug: string): Subgenre | undefined {
  return subgenres.find((s) => s.atlas === atlas && s.slug === slug);
}

export function getSubgenreById(id: string): Subgenre | undefined {
  return subgenres.find((s) => s.id === id);
}

/** A band takes the accent of the subgenre it belongs to. */
export function getAccentForBand(band: Band): AccentName {
  return getSubgenreById(band.subgenreId)?.accent ?? "steel";
}

export function getBandById(id: string): Band | undefined {
  return allBands.find((b) => b.id === id);
}

/** What the Band of the Day hero needs, without the albums and tracks. */
export function toHeroBand(band: Band): HeroBand {
  const { id, name, country, activeYears, vibeTags, photoUrl, logoUrl, audioEmbedUrl, links } = band;
  return { id, name, country, activeYears, vibeTags, photoUrl, logoUrl, audioEmbedUrl, links };
}
