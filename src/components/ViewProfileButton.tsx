"use client";

import { accents } from "@/lib/accents";
import type { AccentName } from "@/types/metal";
import { useBandProfile } from "./BandProfileProvider";

export function ViewProfileButton({
  bandId,
  accent,
}: {
  bandId: string;
  accent: AccentName;
}) {
  const { open } = useBandProfile();
  const a = accents[accent];

  return (
    <button
      type="button"
      onClick={(e) => open(bandId, { trigger: e.currentTarget })}
      className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:scale-105 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-95 ${a.solid} ${a.outline}`}
    >
      View profile
      <svg
        viewBox="0 0 24 24"
        className="size-4 fill-none stroke-current stroke-2"
        aria-hidden
      >
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
