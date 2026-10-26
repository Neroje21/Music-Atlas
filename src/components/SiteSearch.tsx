"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { accents } from "@/lib/accents";
import { atlases } from "@/lib/atlases";
import { fold, search, suggestions, type SearchResult } from "@/lib/search";
import type { AtlasId } from "@/types/metal";

/** Bold the part of `text` that matches the query, when positions line up. */
function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  const folded = fold(text);
  if (folded.length !== text.length) return <>{text}</>;
  const marks = new Array<boolean>(text.length).fill(false);
  for (const token of tokens) {
    const at = folded.indexOf(token);
    if (at !== -1) marks.fill(true, at, at + token.length);
  }
  const parts: { text: string; marked: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1);
    if (last && last.marked === marks[i]) last.text += text[i];
    else parts.push({ text: text[i], marked: marks[i] });
  }
  return (
    <>
      {parts.map((part, i) =>
        part.marked ? (
          <span key={i} className="text-white underline decoration-white/40 underline-offset-2">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** `atlas` limits the search to that atlas; without it the whole site is searched. */
export function SiteSearch({ atlas = null }: { atlas?: AtlasId | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const tokens = useMemo(() => fold(query).split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(
    () => (tokens.length > 0 ? search(query, atlas) : suggestions(atlas)),
    [query, tokens.length, atlas],
  );
  const optionId = (i: number) => `${listId}-option-${i}`;

  // "/" jumps to the search box from anywhere on the page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  }, [active, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(result: SearchResult) {
    router.push(result.href);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.blur();
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      const result = results[active];
      if (open && result) {
        e.preventDefault();
        choose(result);
      }
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else setQuery("");
    }
  }

  const bandsStart = results.findIndex((r) => r.kind === "band");

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search subgenres and bands
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-gray-500 stroke-2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={atlas ? `Search ${atlases[atlas].short.toLowerCase()} bands, genres…` : "Search all bands, genres…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-10 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-white/30 focus:bg-white/10 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setActive(0);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 text-[0.65rem] text-gray-500 sm:block"
          >
            /
          </kbd>
        )}
      </div>

      {open && (
        // Full width under the (two-row) header on phones.
        <div className="fixed left-3 right-3 top-[6.75rem] z-40 overflow-hidden rounded-xl border border-white/10 bg-gray-950/95 shadow-2xl backdrop-blur sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-2">
          <ul
            id={listId}
            role="listbox"
            aria-label="Search results"
            className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain py-1"
          >
            {results.length === 0 && (
              <li role="presentation" className="px-4 py-6 text-center text-sm text-gray-500">
                Nothing matches “{query.trim()}”.
              </li>
            )}
            {results.map((result, i) => {
              const a = accents[result.accent];
              const heading =
                i === 0 && result.kind === "subgenre"
                  ? "Subgenres"
                  : i === bandsStart
                    ? "Bands"
                    : null;
              return (
                <li key={`${result.kind}-${result.id}`} role="presentation">
                  {heading && (
                    <p className="px-4 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gray-500">
                      {heading}
                    </p>
                  )}
                  <div
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => choose(result)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? "bg-white/10" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${a.solid}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-200">
                        <Highlight text={result.title} tokens={tokens} />
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {atlas ? "" : `${atlases[result.atlas].short} · `}
                        {result.subtitle}
                      </span>
                    </span>
                    {result.matchedOn && (
                      <span className={`max-w-[45%] shrink-0 truncate rounded-full border px-2 py-0.5 text-[0.65rem] ${a.tag}`}>
                        {result.matchedOn}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p aria-live="polite" className="sr-only">
            {tokens.length > 0 ? `${results.length} results` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
