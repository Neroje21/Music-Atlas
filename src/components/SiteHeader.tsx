"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { atlasIds, atlases, isAtlasId } from "@/lib/atlases";
import type { AtlasId } from "@/types/metal";
import { SiteSearch } from "./SiteSearch";

function AtlasSwitch({ active }: { active: AtlasId | null }) {
  return (
    <nav
      aria-label="Atlas"
      className="flex shrink-0 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs font-semibold uppercase tracking-wider"
    >
      {atlasIds.map((id) => (
        <Link
          key={id}
          href={`/${id}`}
          aria-current={id === active ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            id === active ? atlases[id].switchActive : "text-gray-400 hover:text-white"
          }`}
        >
          {atlases[id].short}
        </Link>
      ))}
    </nav>
  );
}

// The first URL segment says which atlas we're in ("/metal/...", "/rock/..."),
// so the header can sit in the root layout and still follow the page.
export function SiteHeader() {
  const segment = useSelectedLayoutSegment();
  const atlas = isAtlasId(segment) ? segment : null;
  const info = atlas ? atlases[atlas] : null;

  return (
    <header
      data-atlas={atlas ?? undefined}
      className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur"
    >
      {/* Two rows on phones (brand and switch, then search); one row from sm up. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href={atlas ? `/${atlas}` : "/"}
            className={`shrink-0 font-display text-2xl tracking-wide text-gray-100 transition-colors sm:text-3xl ${
              info?.brandHover ?? "hover:text-white"
            }`}
          >
            {info?.name ?? "Atlas"}
          </Link>
          <AtlasSwitch active={atlas} />
        </div>
        <SiteSearch atlas={atlas} />
      </div>
    </header>
  );
}
