import { accents } from "@/lib/accents";
import type { AccentName } from "@/types/metal";

export function VibeTag({
  label,
  accent,
}: {
  label: string;
  accent: AccentName;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${accents[accent].tag}`}
    >
      {label}
    </span>
  );
}
