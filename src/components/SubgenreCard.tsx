import Image from "next/image";
import Link from "next/link";
import { accents } from "@/lib/accents";
import type { Subgenre } from "@/types/metal";

export function SubgenreCard({ subgenre }: { subgenre: Subgenre }) {
  const accent = accents[subgenre.accent];

  return (
    <Link
      href={`/${subgenre.atlas}/genre/${subgenre.slug}`}
      className={`group relative block aspect-[16/10] overflow-hidden sm:aspect-[3/4] rounded-2xl border border-white/10 bg-gray-900 transition duration-200 ease-out hover:z-10 hover:scale-[1.03] focus-visible:z-10 focus-visible:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 ${accent.border} ${accent.glow} ${accent.outline}`}
    >
      <Image
        src={subgenre.coverUrl}
        alt=""
        fill
        loading="eager"
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover opacity-60 transition duration-500 group-hover:scale-110 group-hover:opacity-80"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
      <div
        className={`absolute inset-0 bg-linear-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${accent.wash}`}
      />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.25em] ${accent.text}`}
        >
          {subgenre.bands.length} bands
        </p>
        {/* Scales with the viewport so long names ("Psychedelic Rock") don't split mid-word. */}
        <h2 className="mt-2 font-display text-4xl leading-none text-white sm:text-[clamp(2.25rem,4vw,3rem)] lg:text-[clamp(1.9rem,3vw,3rem)]">
          {subgenre.name}
        </h2>
        <p className="mt-3 text-sm text-gray-400">{subgenre.tagline}</p>
      </div>
    </Link>
  );
}
