import type { AtlasId, Subgenre, SubgenreInput } from "@/types/metal";
import { blackMetal } from "./genres/metal/black-metal.ts";
import { deathMetal } from "./genres/metal/death-metal.ts";
import { doomMetal } from "./genres/metal/doom-metal.ts";
import { folkMetal } from "./genres/metal/folk-metal.ts";
import { glamMetal } from "./genres/metal/glam-metal.ts";
import { gothicMetal } from "./genres/metal/gothic-metal.ts";
import { grooveMetal } from "./genres/metal/groove-metal.ts";
import { heavyMetal } from "./genres/metal/heavy-metal.ts";
import { industrialMetal } from "./genres/metal/industrial-metal.ts";
import { melodicDeathMetal } from "./genres/metal/melodic-death-metal.ts";
import { metalcore } from "./genres/metal/metalcore.ts";
import { nuMetal } from "./genres/metal/nu-metal.ts";
import { powerMetal } from "./genres/metal/power-metal.ts";
import { progressiveMetal } from "./genres/metal/progressive-metal.ts";
import { symphonicMetal } from "./genres/metal/symphonic-metal.ts";
import { thrashMetal } from "./genres/metal/thrash-metal.ts";

import { alternativeRock } from "./genres/rock/alternative-rock.ts";
import { bluesRock } from "./genres/rock/blues-rock.ts";
import { britpop } from "./genres/rock/britpop.ts";
import { classicRock } from "./genres/rock/classic-rock.ts";
import { folkRock } from "./genres/rock/folk-rock.ts";
import { garageRock } from "./genres/rock/garage-rock.ts";
import { grunge } from "./genres/rock/grunge.ts";
import { hardRock } from "./genres/rock/hard-rock.ts";
import { indieRock } from "./genres/rock/indie-rock.ts";
import { popPunkEmo } from "./genres/rock/pop-punk-emo.ts";
import { postPunk } from "./genres/rock/post-punk.ts";
import { progressiveRock } from "./genres/rock/progressive-rock.ts";
import { psychedelicRock } from "./genres/rock/psychedelic-rock.ts";
import { punkRock } from "./genres/rock/punk-rock.ts";
import { shoegaze } from "./genres/rock/shoegaze.ts";
import { southernRock } from "./genres/rock/southern-rock.ts";

/*
 * One file per subgenre in ./genres/<atlas>, built with the `band()` helper in
 * helpers.ts (which also explains where lineups, tracklists and links come
 * from). Relative imports keep their `.ts` extension so the Node scripts in
 * /scripts can load this file directly.
 *
 * To add a subgenre: copy a file in ./genres/<atlas>, add it to that atlas
 * below, then run `npm run logos`, `npm run tracklists:wiki` and `npm run links`.
 *
 * The order of each list is the order of its homepage grid, roughly
 * chronological. Band and album ids are unique across both atlases, because the
 * generated JSON files are keyed by them.
 */
/** A subgenre's tile shows a real band photo from it, once any have been found. */
function withBandCover(subgenre: Subgenre): Subgenre {
  const real = subgenre.bands.find((b) => !b.photoUrl.includes("picsum.photos"));
  return real ? { ...subgenre, coverUrl: real.photoUrl } : subgenre;
}

const forAtlas = (atlas: AtlasId, genres: SubgenreInput[]): Subgenre[] =>
  genres.map((genre) => withBandCover({ ...genre, atlas }));

const metal = forAtlas("metal", [
  heavyMetal,
  glamMetal,
  thrashMetal,
  powerMetal,
  deathMetal,
  melodicDeathMetal,
  blackMetal,
  doomMetal,
  gothicMetal,
  progressiveMetal,
  symphonicMetal,
  folkMetal,
  industrialMetal,
  grooveMetal,
  nuMetal,
  metalcore,
]);

const rock = forAtlas("rock", [
  classicRock,
  hardRock,
  bluesRock,
  psychedelicRock,
  progressiveRock,
  folkRock,
  southernRock,
  garageRock,
  punkRock,
  postPunk,
  alternativeRock,
  grunge,
  indieRock,
  britpop,
  shoegaze,
  popPunkEmo,
]);

/** Every subgenre of every atlas; each carries its `atlas`. */
export const subgenres: Subgenre[] = [...metal, ...rock];
