import Image from "next/image";
import { accents } from "@/lib/accents";
import type { AccentName, Band } from "@/types/metal";
import { BandLogo } from "./BandLogo";
import { ListenLinks } from "./ListenLinks";
import { ViewProfileButton } from "./ViewProfileButton";
import { VibeTag } from "./VibeTag";

/** The slice of a band the hero shows, so the full discography isn't sent along. */
export type HeroBand = Pick<
  Band,
  | "id"
  | "name"
  | "country"
  | "activeYears"
  | "vibeTags"
  | "photoUrl"
  | "logoUrl"
  | "audioEmbedUrl"
  | "links"
>;

function AudioPlayer({ band }: { band: HeroBand }) {
  if (band.audioEmbedUrl) {
    return (
      <iframe
        src={band.audioEmbedUrl}
        title={`${band.name} audio player`}
        allow="autoplay; encrypted-media"
        loading="lazy"
        className="h-40 w-full rounded-2xl border border-white/10"
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-5 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.25em] text-gray-400">
        Listen now
      </p>
      <p className="mt-3 text-sm text-gray-400">
        Stream {band.name} on your service of choice.
      </p>
      <ListenLinks links={band.links} className="mt-4" />
    </div>
  );
}

export function HeroBandOfTheDay({
  band,
  accent,
}: {
  band: HeroBand;
  accent: AccentName;
}) {
  const a = accents[accent];

  return (
    <section
      aria-labelledby="band-of-the-day"
      className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gray-900"
    >
      <Image
        src={band.photoUrl}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="-z-10 object-cover opacity-50"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-black via-black/70 to-black/20" />
      <div
        className={`absolute inset-0 -z-10 bg-linear-to-t to-transparent ${a.wash}`}
      />

      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:p-14">
        <div>
          <p
            id="band-of-the-day"
            className={`text-xs font-semibold uppercase tracking-[0.3em] ${a.text}`}
          >
            Band of the Day
          </p>
          <BandLogo
            band={band}
            loading="eager"
            className="mt-4 h-24 w-auto max-w-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          />
          <h2 className="sr-only">{band.name}</h2>
          <p className="mt-4 text-sm text-gray-300">
            {band.country} · {band.activeYears}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {band.vibeTags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <VibeTag label={tag} accent={accent} />
              </li>
            ))}
          </ul>
          <ViewProfileButton bandId={band.id} accent={accent} />
        </div>

        <AudioPlayer band={band} />
      </div>
    </section>
  );
}

export function HeroBandOfTheDaySkeleton() {
  return (
    <div
      aria-hidden
      className="h-96 animate-pulse rounded-3xl border border-white/10 bg-gray-900"
    />
  );
}
