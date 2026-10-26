import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { accents } from "@/lib/accents";
import { getSubgenreBySlug, toHeroBand } from "@/lib/bands";
import type { AtlasId } from "@/types/metal";
import { BandCard } from "../BandCard";
import { BandOfTheDay } from "../BandOfTheDay";
import { BandProfileProvider } from "../BandProfileProvider";

// `params` is only awaited inside the Suspense boundary below, so navigating
// here from the atlas homepage can show the page frame instantly.
export function AtlasGenrePage({
  atlas,
  params,
}: {
  atlas: AtlasId;
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/${atlas}`}
        className="text-sm text-gray-500 transition-colors hover:text-gray-200"
      >
        ← All subgenres
      </Link>

      <Suspense fallback={<SubgenreSkeleton />}>
        <SubgenreContent atlas={atlas} params={params} />
      </Suspense>
    </div>
  );
}

async function SubgenreContent({
  atlas,
  params,
}: {
  atlas: AtlasId;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subgenre = getSubgenreBySlug(atlas, slug);
  if (!subgenre) notFound();

  const accent = accents[subgenre.accent];

  return (
    <BandProfileProvider>
      <header className="mb-8 mt-6 max-w-3xl">
        <h1 className="font-display text-5xl text-white sm:text-7xl">
          {subgenre.name}
        </h1>
        <p
          className={`mt-3 text-sm font-semibold uppercase tracking-[0.25em] ${accent.text}`}
        >
          {subgenre.tagline}
        </p>
        <p className="mt-4 text-gray-400">{subgenre.description}</p>
      </header>

      <BandOfTheDay
        bands={subgenre.bands.map(toHeroBand)}
        accent={subgenre.accent}
      />

      <section aria-labelledby="roster" className="mt-14">
        <h2
          id="roster"
          className="mb-6 font-display text-3xl text-white sm:text-4xl"
        >
          Band Roster
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {subgenre.bands.map((band, i) => (
            <BandCard
              key={band.id}
              band={band}
              accent={subgenre.accent}
              index={i}
            />
          ))}
        </div>
      </section>
    </BandProfileProvider>
  );
}

function SubgenreSkeleton() {
  return (
    <div aria-hidden className="mt-6 animate-pulse">
      <div className="h-16 w-80 max-w-full rounded-lg bg-gray-900" />
      <div className="mt-4 h-4 w-96 max-w-full rounded bg-gray-900" />
      <div className="mt-8 h-96 rounded-3xl bg-gray-900" />
    </div>
  );
}
