export type BandStatus = "active" | "hiatus" | "disbanded";

/** The two sections of the site; they share every component and live under /metal and /rock. */
export type AtlasId = "metal" | "rock";

/** Maps to a colour set in `src/lib/accents.ts` ("purple" uses the `occult` tokens). */
export type AccentName =
  | "blood"
  | "purple"
  | "steel"
  | "ember"
  | "amber"
  | "azure"
  | "jade"
  | "rose";

export interface StreamingLink {
  url: string;
  /** False when `url` is a search results page rather than the artist/album. */
  direct: boolean;
}

export interface StreamingLinks {
  spotify: StreamingLink;
  youtubeMusic: StreamingLink;
}

export interface Track {
  title: string;
  /** Length in seconds; `null` when unknown. */
  seconds: number | null;
}

export interface Album {
  id: string;
  title: string;
  year: number;
  coverUrl: string;
  /** In running order. Empty when no tracklist has been fetched. */
  tracks: Track[];
  links: StreamingLinks;
}

export interface Band {
  /** Globally unique slug, e.g. "cannibal-corpse". */
  id: string;
  /** Back-reference to the parent subgenre. */
  subgenreId: string;
  name: string;
  logoUrl: string;
  /** Card background and modal hero. */
  photoUrl: string;
  country: string;
  /** "1989–present" or "1991–2004". */
  activeYears: string;
  /** Disbanded bands show "Final Lineup" instead of "Current Lineup". */
  status: BandStatus;
  /** 3–4 tags, e.g. ["Fast", "Guttural", "Gore"]. */
  vibeTags: string[];
  /** "Name — Role". */
  originalLineup: string[];
  /** Same format; for disbanded bands this is the final lineup. */
  currentLineup: string[];
  /** Oldest to newest. */
  albums: Album[];
  /** Exactly three band ids; may point into other subgenres. */
  similarBandIds: [string, string, string];
  /** Band of the Day player. `null` renders the placeholder. */
  audioEmbedUrl: string | null;
  /** Spotify/YouTube iframe for the Top Tracks section. `null` renders the placeholder. */
  topTracksEmbedUrl: string | null;
  links: StreamingLinks;
}

export interface Subgenre {
  /** Which atlas it belongs to; set when `mockData.ts` assembles the lists. */
  atlas: AtlasId;
  /** "death-metal" */
  id: string;
  /** Used in the route /<atlas>/genre/[slug]. */
  slug: string;
  /** "Death Metal" */
  name: string;
  /** One line shown on the tile. */
  tagline: string;
  /** Shown in the dashboard header. */
  description: string;
  /** Tile background. */
  coverUrl: string;
  accent: AccentName;
  /** At least 3 per subgenre. */
  bands: Band[];
}

/** What a genre file writes; `atlas` is added by the file that assembles them. */
export type SubgenreInput = Omit<Subgenre, "atlas">;
