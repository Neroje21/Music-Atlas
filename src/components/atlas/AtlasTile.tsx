import Image from "next/image";
import Link from "next/link";
import { atlases } from "@/lib/atlases";
import { getAtlasBands, getAtlasSubgenres } from "@/lib/bands";
import type { AtlasId } from "@/types/metal";

/** One of the two big choices on the landing page. */
export function AtlasTile({ atlas }: { atlas: AtlasId }) {
  const info = atlases[atlas];
  const subgenres = getAtlasSubgenres(atlas);
  // A strip of real band photos, taken from the subgenres that have one.
  const photos = subgenres
    .map((s) => s.coverUrl)
    .filter((url) => !url.includes("picsum.photos"))
    .slice(0, 4);

  return (
    <Link
      href={`/${atlas}`}
      data-atlas={atlas}
      className={`group relative block min-h-[22rem] overflow-hidden rounded-3xl border border-white/10 bg-gray-900 transition duration-200 ease-out hover:z-10 hover:scale-[1.015] focus-visible:z-10 focus-visible:scale-[1.015] focus-visible:outline-2 focus-visible:outline-offset-4 ${info.tileBorder} ${info.tileGlow}`}
    >
      <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-4">
        {photos.map((url) => (
          <div key={url} className="relative">
            <Image
              src={url}
              alt=""
              fill
              loading="eager"
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover opacity-45 transition duration-500 group-hover:scale-105 group-hover:opacity-65"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/65 to-black/20" />
      <div
        className={`absolute inset-0 bg-linear-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${info.tileWash}`}
      />

      <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.3em] ${info.tileText}`}
        >
          {subgenres.length} subgenres · {getAtlasBands(atlas).length} bands
        </p>
        <h2 className="mt-3 font-display text-5xl leading-none text-white sm:text-6xl">
          {info.name}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-gray-300">{info.blurb}</p>
        <span
          className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${info.tileText}`}
        >
          Explore
          <svg
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current stroke-2 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
