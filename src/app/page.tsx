import { AtlasTile } from "@/components/atlas/AtlasTile";
import { SiteFooter } from "@/components/SiteFooter";
import { atlasIds } from "@/lib/atlases";

// The landing page: one door into each atlas.
export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <header className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Two atlases
            </p>
            <h1 className="mt-3 font-display text-5xl text-white sm:text-6xl">
              Pick an atlas
            </h1>
            <p className="mt-4 text-gray-400">
              Each atlas is a guide to a family of music: its subgenres, a
              featured band every day, full rosters with lineups, discographies
              and tracklists, and a search across all of it.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {atlasIds.map((atlas) => (
              <AtlasTile key={atlas} atlas={atlas} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
