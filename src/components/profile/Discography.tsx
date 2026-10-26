import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { accents } from "@/lib/accents";
import type { AccentName, Album, Track } from "@/types/metal";
import { ListenLinks } from "../ListenLinks";
import { SectionHeading } from "./SectionHeading";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "42 min", or null if any track length is unknown. */
function totalMinutes(tracks: Track[]) {
  let total = 0;
  for (const track of tracks) {
    if (track.seconds === null) return null;
    total += track.seconds;
  }
  return `${Math.round(total / 60)} min`;
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll albums left" : "Scroll albums right"}
      className="grid size-9 place-items-center rounded-full border border-white/15 text-gray-300 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-4 fill-none stroke-current stroke-2 ${direction === "left" ? "" : "rotate-180"}`}
        aria-hidden
      >
        <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Tracklist({
  album,
  accent,
  onClose,
}: {
  album: Album;
  accent: AccentName;
  onClose: () => void;
}) {
  const a = accents[accent];
  const { tracks } = album;
  const meta = [
    String(album.year),
    tracks.length > 0 ? `${tracks.length} tracks` : null,
    totalMinutes(tracks),
  ].filter(Boolean);

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold text-white">{album.title}</h4>
          <p className={`mt-0.5 text-xs uppercase tracking-wider ${a.text}`}>
            {meta.join(" · ")}
          </p>
          <ListenLinks links={album.links} compact className="mt-3" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Hide tracks
        </button>
      </div>

      {tracks.length > 0 ? (
        <>
          <ol className="mt-4 sm:columns-2 sm:gap-x-10">
            {tracks.map((track, i) => (
              <li
                key={`${i}-${track.title}`}
                className="flex break-inside-avoid items-baseline gap-3 border-b border-white/5 py-2 text-sm"
              >
                <span className="w-6 shrink-0 text-right tabular-nums text-gray-600">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-gray-200">{track.title}</span>
                <span className="shrink-0 tabular-nums text-gray-500">
                  {formatDuration(track.seconds)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[0.65rem] text-gray-600">
            Tracklists compiled from Wikipedia and MusicBrainz.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          No tracklist available for this album yet.
        </p>
      )}
    </div>
  );
}

export function Discography({
  albums,
  accent,
}: {
  albums: Album[];
  accent: AccentName;
}) {
  const headingId = useId();
  const panelId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const a = accents[accent];
  const selected = albums.find((album) => album.id === selectedId) ?? null;
  const behavior = reduceMotion ? "auto" : "smooth";

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior });
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading id={headingId}>Discography</SectionHeading>
        <div className="flex gap-2">
          <ArrowButton direction="left" onClick={() => scroll(-1)} />
          <ArrowButton direction="right" onClick={() => scroll(1)} />
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">Select an album to see its tracks.</p>

      <ul
        ref={trackRef}
        aria-label="Albums, scroll horizontally"
        className="-mx-5 mt-4 flex scroll-px-5 snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-color:var(--color-steel-600)_transparent] [scrollbar-width:thin] sm:-mx-8 sm:scroll-px-8 sm:px-8"
      >
        {albums.map((album) => {
          const isSelected = album.id === selectedId;
          return (
            <li key={album.id} className="w-36 shrink-0 snap-start sm:w-44">
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : album.id)}
                aria-expanded={isSelected}
                aria-controls={isSelected ? panelId : undefined}
                className={`group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 ${a.outline}`}
              >
                <div
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-gray-900 transition duration-200 group-hover:scale-[1.03] ${isSelected ? `border-transparent ${a.ring}` : `border-white/10 ${a.border}`}`}
                >
                  <Image
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-200">
                  {album.title}
                </p>
                <p className={`text-xs ${a.text}`}>
                  {album.year}
                  {album.tracks.length > 0 && (
                    <span className="text-gray-500">
                      {" "}
                      · {album.tracks.length} tracks
                    </span>
                  )}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="tracklist"
            id={panelId}
            ref={panelRef}
            role="region"
            aria-label={`${selected.title} tracklist`}
            className="overflow-hidden"
            variants={{
              open: { height: "auto", opacity: 1 },
              closed: { height: 0, opacity: 0 },
            }}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.25, ease: "easeOut" }}
            onAnimationComplete={(definition) => {
              if (definition === "open") {
                panelRef.current?.scrollIntoView({ block: "nearest", behavior });
              }
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Tracklist
                  album={selected}
                  accent={accent}
                  onClose={() => setSelectedId(null)}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
