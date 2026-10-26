import Link from "next/link";
import { subgenres } from "@/data/mockData";
import { atlasIds, atlases } from "@/lib/atlases";
import { getAtlasBands, getAtlasSubgenres } from "@/lib/bands";
import type { AtlasId } from "@/types/metal";

const SOURCES = [
  { label: "Wikipedia", href: "https://en.wikipedia.org", note: "tracklists, lineups (CC BY-SA 4.0)" },
  { label: "MusicBrainz", href: "https://musicbrainz.org", note: "streaming links, fallback data (CC0)" },
  { label: "TheAudioDB", href: "https://www.theaudiodb.com", note: "band logos and photos" },
  { label: "Cover Art Archive", href: "https://coverartarchive.org", note: "album covers" },
  { label: "iTunes Search", href: "https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html", note: "a few more covers" },
  { label: "Spotify", href: "https://open.spotify.com", note: "Top Tracks player" },
  { label: "YouTube Music", href: "https://music.youtube.com", note: "listen links" },
] as const;

const linkClass =
  "text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** `atlas` shows that atlas's subgenres; without it (the landing page) both are listed. */
export function SiteFooter({ atlas }: { atlas?: AtlasId }) {
  const info = atlas ? atlases[atlas] : null;
  const shown = atlas ? [atlas] : atlasIds;
  const bandCount = atlas ? getAtlasBands(atlas).length : subgenres.flatMap((s) => s.bands).length;
  const subgenreCount = atlas ? getAtlasSubgenres(atlas).length : subgenres.length;

  return (
    <footer className="mt-24 border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr_1.2fr]">
          <div data-atlas={atlas}>
            <Link
              href={atlas ? `/${atlas}` : "/"}
              className={`font-display text-4xl tracking-wide text-gray-100 transition-colors ${
                info?.brandHover ?? "hover:text-white"
              }`}
            >
              {info?.name ?? "Atlas"}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-500">
              {info ? `A guide to ${info.guide}` : "Two guides to loud music"}: {subgenreCount}{" "}
              {atlas ? "subgenres" : "genres"}, {bandCount} bands, and every album&apos;s tracklist.
            </p>
            <p className="mt-4 text-xs text-gray-600">
              Press{" "}
              <kbd className="rounded border border-white/15 px-1.5 text-gray-400">
                /
              </kbd>{" "}
              anywhere to search.
            </p>
          </div>

          <nav
            aria-label="Subgenres"
            className={shown.length > 1 ? "grid gap-8 sm:grid-cols-2" : undefined}
          >
            {shown.map((id) => (
              <div key={id}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                  {shown.length > 1 ? `${atlases[id].short} subgenres` : "Subgenres"}
                </h2>
                <ul
                  className={`mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 ${
                    shown.length > 1 ? "" : "sm:grid-cols-3"
                  }`}
                >
                  {getAtlasSubgenres(id).map((subgenre) => (
                    <li key={subgenre.id}>
                      <Link
                        href={`/${id}/genre/${subgenre.slug}`}
                        prefetch={false}
                        className={linkClass}
                      >
                        {subgenre.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
              Data &amp; credits
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SOURCES.map((source) => (
                <li key={source.label} className="text-sm text-gray-500">
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {source.label}
                  </a>
                  <span className="text-gray-600"> · {source.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-5">
            A personal project. Band photos, logos and album covers are loaded
            from the sources above and belong to their owners, as do band names
            and trademarks. This site isn&apos;t affiliated with any band, label
            or streaming service.
          </p>
          <a href="#" className={`${linkClass} shrink-0`}>
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
