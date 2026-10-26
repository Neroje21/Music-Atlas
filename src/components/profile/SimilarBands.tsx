import Image from "next/image";
import { useId } from "react";
import { accents } from "@/lib/accents";
import { getAccentForBand, getBandById } from "@/lib/bands";
import type { Band } from "@/types/metal";
import { BandLogo } from "../BandLogo";
import { SectionHeading } from "./SectionHeading";

export function SimilarBands({
  ids,
  onSelect,
}: {
  ids: readonly string[];
  onSelect: (bandId: string) => void;
}) {
  const headingId = useId();
  const bands = ids
    .map(getBandById)
    .filter((b): b is Band => b !== undefined);

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading id={headingId}>Similar Bands</SectionHeading>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {bands.map((band) => {
          const a = accents[getAccentForBand(band)];
          return (
            <li key={band.id}>
              <button
                type="button"
                onClick={() => onSelect(band.id)}
                className={`group relative block h-28 w-full overflow-hidden rounded-xl border border-white/10 bg-gray-900 text-left transition duration-200 hover:scale-[1.03] focus-visible:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 ${a.border} ${a.glow} ${a.outline}`}
              >
                <Image
                  src={band.photoUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 260px, 100vw"
                  className="object-cover opacity-50 transition duration-500 group-hover:scale-110 group-hover:opacity-70"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/20" />
                <div className="absolute inset-0 flex flex-col justify-end p-3">
                  <BandLogo
                    band={band}
                    className="h-8 w-auto max-w-full self-start object-left"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {band.country} · {band.activeYears}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
