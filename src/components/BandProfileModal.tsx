"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { accents } from "@/lib/accents";
import { getAccentForBand } from "@/lib/bands";
import type { Band } from "@/types/metal";
import { BandLogo } from "./BandLogo";
import { ListenLinks } from "./ListenLinks";
import { Discography } from "./profile/Discography";
import { Lineup } from "./profile/Lineup";
import { SectionHeading } from "./profile/SectionHeading";
import { SimilarBands } from "./profile/SimilarBands";
import { TopTracks } from "./profile/TopTracks";
import { VibeTag } from "./VibeTag";

const FOCUSABLE =
  'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

const LATEST_LINEUP_LABEL = {
  active: "Current Lineup",
  hiatus: "Latest Lineup",
  disbanded: "Final Lineup",
} as const;

export function BandProfileModal({
  band,
  originBandId,
  swapped,
  onClose,
  onSelectBand,
}: {
  band: Band;
  /** Roster card the modal grows out of, if any. */
  originBandId: string | null;
  /** True once the user has moved on to a similar band. */
  swapped: boolean;
  onClose: () => void;
  onSelectBand: (bandId: string) => void;
}) {
  const accent = getAccentForBand(band);
  const a = accents[accent];
  const titleId = useId();
  const lineupId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The photo and logo only fly between card and modal for the band that was
  // clicked; after jumping to a similar band they simply fade in.
  const shared = originBandId !== null && !swapped;

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      html.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [band.id]);

  // Keep Tab inside the dialog.
  function trapFocus(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.key !== "Tab") return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const panelMotion = originBandId
    ? { layoutId: `card-${originBandId}` }
    : {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.98 },
      };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        // Re-measure only when the band changes, not when content inside the
        // panel (like an opening tracklist) changes its height.
        layoutDependency={band.id}
        style={{ borderRadius: 20 }}
        className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden border border-white/10 bg-gray-950 shadow-2xl sm:max-h-[90dvh]"
        {...panelMotion}
      >
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 z-10 h-0.5 ${a.solid}`}
        />

        <motion.button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close band profile"
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className={`absolute right-3 top-3 z-20 grid size-10 place-items-center rounded-full border border-white/15 bg-black/60 text-gray-200 backdrop-blur transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 ${a.outline}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5 fill-none stroke-current stroke-2"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </motion.button>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <motion.header
            key={`hero-${band.id}`}
            className="relative h-64 shrink-0 sm:h-80"
            initial={swapped ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              layoutId={shared ? `photo-${band.id}` : undefined}
              className="absolute inset-0"
            >
              <Image
                src={band.photoUrl}
                alt={`${band.name} band photo`}
                fill
                sizes="(min-width: 896px) 896px, 100vw"
                className="object-cover opacity-75"
              />
            </motion.div>
            <div className="absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/40 to-black/30" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-8">
              <motion.div
                layoutId={shared ? `logo-${band.id}` : undefined}
                className="w-fit max-w-full"
              >
                <BandLogo
                  band={band}
                  className="h-16 w-auto max-w-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:h-24"
                />
              </motion.div>
              <h2 id={titleId} className="sr-only">
                {band.name}
              </h2>
              <p className="text-sm text-gray-300">
                {band.country} · {band.activeYears}
                {band.status !== "active" && (
                  <span className="ml-2 rounded-full border border-white/15 bg-black/50 px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-gray-400">
                    {band.status === "hiatus" ? "On hiatus" : "Disbanded"}
                  </span>
                )}
              </p>
              <ListenLinks links={band.links} />
            </div>
          </motion.header>

          <motion.div
            key={`body-${band.id}`}
            className="space-y-10 p-5 sm:p-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: swapped ? 0 : 0.15, duration: 0.25 }}
          >
            <ul className="flex flex-wrap gap-2" aria-label="Vibe tags">
              {band.vibeTags.map((tag) => (
                <li key={tag}>
                  <VibeTag label={tag} accent={accent} />
                </li>
              ))}
            </ul>

            <section aria-labelledby={lineupId}>
              <SectionHeading id={lineupId}>Lineup Timeline</SectionHeading>
              <div className="mt-5 grid gap-8 sm:grid-cols-2">
                <Lineup
                  title="Original Lineup"
                  members={band.originalLineup}
                  accent={accent}
                />
                <Lineup
                  title={LATEST_LINEUP_LABEL[band.status]}
                  members={band.currentLineup}
                  accent={accent}
                  highlighted
                />
              </div>
            </section>

            <Discography albums={band.albums} accent={accent} />
            <TopTracks band={band} />
            <SimilarBands ids={band.similarBandIds} onSelect={onSelectBand} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
