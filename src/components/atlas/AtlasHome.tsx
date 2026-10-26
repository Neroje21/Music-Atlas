import type { CSSProperties } from "react";
import { accents } from "@/lib/accents";
import { atlases } from "@/lib/atlases";
import { getAtlasBands, getAtlasSubgenres } from "@/lib/bands";
import type { AtlasId } from "@/types/metal";
import { SubgenreCard } from "../SubgenreCard";

/** The subgenre grid at the top of an atlas (/metal, /rock). */
export function AtlasHome({ atlas }: { atlas: AtlasId }) {
  const info = atlases[atlas];
  const subgenres = getAtlasSubgenres(atlas);
  const bandCount = getAtlasBands(atlas).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.3em] ${accents[info.accent].text}`}
        >
          {info.kicker}
        </p>
        <h1 className="mt-3 font-display text-5xl text-white sm:text-6xl">
          {info.headline}
        </h1>
        <p className="mt-4 text-gray-400">
          {subgenres.length} subgenres and {bandCount} bands. {info.intro}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {subgenres.map((subgenre, i) => (
          <div
            key={subgenre.id}
            className="rise"
            style={{ "--i": i } as CSSProperties}
          >
            <SubgenreCard subgenre={subgenre} />
          </div>
        ))}
      </div>
    </div>
  );
}
