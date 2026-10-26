import type { StreamingLink, StreamingLinks } from "@/types/metal";

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M5.5 9.2c4.2-1.2 9-.9 13 1.3M6.3 12.5c3.5-1 7.4-.7 10.5 1.1M7.1 15.6c2.9-.8 5.8-.5 8.3.9"
        fill="none"
        stroke="#000"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function YouTubeMusicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0">
      <circle cx="12" cy="12" r="12" fill="#FF0000" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="#fff" strokeWidth="1.4" />
      <path d="M10.2 9.1l4.6 2.9-4.6 2.9z" fill="#fff" />
    </svg>
  );
}

function ListenLink({
  link,
  name,
  compact,
  children,
}: {
  link: StreamingLink;
  name: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  const shortName = name.replace("YouTube Music", "YT Music");
  const label = link.direct ? name : `Search ${name}`;
  const compactLabel = link.direct ? shortName : `Search ${shortName}`;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.direct ? `Open in ${name}` : `No direct link on file; searches ${name}`}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 font-medium text-gray-200 transition duration-200 hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"}`}
    >
      {children}
      {compact ? compactLabel : label}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-3 shrink-0 fill-none stroke-current stroke-2 opacity-60"
      >
        <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Spotify and YouTube Music buttons; direct links where known, searches otherwise. */
export function ListenLinks({
  links,
  compact = false,
  className = "",
}: {
  links: StreamingLinks;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <ListenLink link={links.spotify} name="Spotify" compact={compact}>
        <SpotifyIcon />
      </ListenLink>
      <ListenLink link={links.youtubeMusic} name="YouTube Music" compact={compact}>
        <YouTubeMusicIcon />
      </ListenLink>
    </div>
  );
}
