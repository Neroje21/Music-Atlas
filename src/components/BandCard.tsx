"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { CSSProperties } from "react";
import { accents } from "@/lib/accents";
import type { AccentName, Band } from "@/types/metal";
import { BandLogo } from "./BandLogo";
import { useBandProfile } from "./BandProfileProvider";

const STATUS_LABEL = {
  active: null,
  hiatus: "On hiatus",
  disbanded: "Disbanded",
} as const;

export function BandCard({
  band,
  accent,
  index,
}: {
  band: Band;
  accent: AccentName;
  /** Position in the grid; staggers the entrance. */
  index: number;
}) {
  const { open } = useBandProfile();
  const a = accents[accent];
  const status = STATUS_LABEL[band.status];

  return (
    <div className="rise" style={{ "--i": index } as CSSProperties}>
      <motion.button
        type="button"
        layoutId={`card-${band.id}`}
        onClick={(e) => open(band.id, { fromCard: true, trigger: e.currentTarget })}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        style={{ borderRadius: 12 }}
        aria-label={`Open ${band.name} profile`}
        className={`group relative block aspect-[4/5] w-full overflow-hidden border border-white/10 bg-gray-900 text-left transition-[border-color,box-shadow] duration-200 hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 ${a.border} ${a.glow} ${a.outline}`}
      >
        <motion.div layoutId={`photo-${band.id}`} className="absolute inset-0">
          <Image
            src={band.photoUrl}
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
          />
        </motion.div>
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/30 to-black/40" />

        {status && (
          <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-gray-400">
            {status}
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center px-8">
          <motion.div layoutId={`logo-${band.id}`} className="max-w-full">
            <BandLogo
              band={band}
              className="h-16 w-auto max-w-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            />
          </motion.div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-sm">
          <span className="font-medium text-gray-200">{band.country}</span>
          <span className="text-gray-400">{band.activeYears}</span>
        </div>
      </motion.button>
    </div>
  );
}
