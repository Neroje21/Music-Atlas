import { accents } from "@/lib/accents";
import type { AccentName } from "@/types/metal";

/** Lineup entries are "Name — Role". */
function splitMember(entry: string): [name: string, role: string | null] {
  const i = entry.indexOf(" — ");
  return i === -1 ? [entry, null] : [entry.slice(0, i), entry.slice(i + 3)];
}

export function Lineup({
  title,
  members,
  accent,
  highlighted = false,
}: {
  title: string;
  members: string[];
  accent: AccentName;
  /** The later lineup gets the accent colour so the two read as a timeline. */
  highlighted?: boolean;
}) {
  const a = accents[accent];

  return (
    <div>
      <h4
        className={`text-xs font-semibold uppercase tracking-[0.25em] ${highlighted ? a.text : "text-gray-500"}`}
      >
        {title}
      </h4>
      <ol className="mt-4 space-y-4 border-l border-white/15 pl-6">
        {members.map((entry) => {
          const [name, role] = splitMember(entry);
          return (
            <li key={entry} className="relative">
              <span
                aria-hidden
                className={`absolute -left-[29.5px] top-1.5 size-2.5 rounded-full ring-4 ring-gray-950 ${highlighted ? a.solid : "bg-gray-600"}`}
              />
              <p className="font-medium text-gray-100">{name}</p>
              {role && <p className="text-sm text-gray-500">{role}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
