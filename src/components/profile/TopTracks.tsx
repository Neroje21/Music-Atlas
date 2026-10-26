import { useId } from "react";
import type { Band } from "@/types/metal";
import { ListenLinks } from "../ListenLinks";
import { SectionHeading } from "./SectionHeading";

export function TopTracks({ band }: { band: Band }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading id={headingId}>Top Tracks</SectionHeading>
      {band.topTracksEmbedUrl ? (
        <iframe
          src={band.topTracksEmbedUrl}
          title={`${band.name} top tracks on Spotify`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="mt-4 h-[352px] w-full rounded-xl border-0"
        />
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6">
          <p className="text-sm text-gray-400">
            No embedded player for {band.name} yet. Listen on:
          </p>
          <ListenLinks links={band.links} className="mt-4" />
        </div>
      )}
    </section>
  );
}
