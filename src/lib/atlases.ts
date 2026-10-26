import type { AccentName, AtlasId } from "@/types/metal";

/*
 * The site has two atlases that share every component: each lives under its own
 * route (/metal, /rock) and has its own subgenres, copy and colours. This file
 * holds only copy and class names, never band data, so client components can
 * import it without pulling the data set into the browser bundle.
 *
 * Tailwind only generates classes it can see as complete strings, so the colour
 * classes are spelled out here rather than built from `accent`.
 */
export interface AtlasInfo {
  id: AtlasId;
  /** "Metal Atlas", the wordmark. */
  name: string;
  /** "Metal", for the switch and search placeholder. */
  short: string;
  accent: AccentName;
  /** Small label above the homepage heading. */
  kicker: string;
  headline: string;
  /** Sentence after the subgenre and band counts on the atlas homepage. */
  intro: string;
  /** What the footer says it is a guide to. */
  guide: string;
  /** Landing-page tile blurb. */
  blurb: string;
  description: string;
  /** Wordmark hover colour. */
  brandHover: string;
  /** The selected side of the Metal | Rock switch. */
  switchActive: string;
  /** Landing tile accents. */
  tileText: string;
  tileBorder: string;
  tileGlow: string;
  tileWash: string;
}

export const atlases: Record<AtlasId, AtlasInfo> = {
  metal: {
    id: "metal",
    name: "Metal Atlas",
    short: "Metal",
    accent: "blood",
    kicker: "Pick a subgenre",
    headline: "Descend into the sound",
    intro:
      "Choose one to meet today's featured band and browse the rest of the roster, or search for a band, album or member.",
    guide: "heavy music",
    blurb:
      "From Sabbath's first riff to the extremes of death, black and doom: heavy music, subgenre by subgenre.",
    description: "Explore metal subgenres and discover bands, one card at a time.",
    brandHover: "hover:text-blood-400",
    switchActive: "bg-blood-600 text-white",
    tileText: "text-blood-400",
    tileBorder: "hover:border-blood-500 focus-visible:border-blood-500",
    tileGlow:
      "hover:shadow-[0_0_64px_-16px_var(--color-blood-500)] focus-visible:shadow-[0_0_64px_-16px_var(--color-blood-500)]",
    tileWash: "from-blood-700/70",
  },
  rock: {
    id: "rock",
    name: "Rock Atlas",
    short: "Rock",
    accent: "ember",
    kicker: "Pick a style",
    headline: "Turn it up",
    intro:
      "Choose one to meet today's featured band and browse the rest of the roster, or search for a band, album or member.",
    guide: "rock music",
    blurb:
      "From the British Invasion and arena rock to punk, grunge and indie: the bands that shaped rock and roll.",
    description: "Explore rock styles and discover bands, one card at a time.",
    brandHover: "hover:text-ember-400",
    switchActive: "bg-ember-600 text-white",
    tileText: "text-ember-400",
    tileBorder: "hover:border-ember-500 focus-visible:border-ember-500",
    tileGlow:
      "hover:shadow-[0_0_64px_-16px_var(--color-ember-500)] focus-visible:shadow-[0_0_64px_-16px_var(--color-ember-500)]",
    tileWash: "from-ember-700/70",
  },
};

export const atlasIds: AtlasId[] = ["metal", "rock"];

export const isAtlasId = (value: string | null | undefined): value is AtlasId =>
  value === "metal" || value === "rock";
