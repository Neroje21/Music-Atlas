"use client";

import { AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getBandById } from "@/lib/bands";
import { BandProfileModal } from "./BandProfileModal";

interface OpenOptions {
  /** Opened from a roster card: the modal grows out of that card. */
  fromCard?: boolean;
  /** Element to hand focus back to when the profile closes. */
  trigger?: HTMLElement | null;
}

interface BandProfileContextValue {
  open: (bandId: string, options?: OpenOptions) => void;
  selectedBandId: string | null;
}

interface Selection {
  bandId: string;
  /** The card the modal grew out of; `null` when opened elsewhere (e.g. the hero). */
  originBandId: string | null;
  /** True once the user has jumped to a similar band inside the modal. */
  swapped: boolean;
}

const BandProfileContext = createContext<BandProfileContextValue | null>(null);

export function useBandProfile() {
  const ctx = useContext(BandProfileContext);
  if (!ctx) {
    throw new Error("useBandProfile must be used inside <BandProfileProvider>");
  }
  return ctx;
}

/** Sets or clears `?band=` without a Next.js navigation, so nothing refetches. */
function writeBandParam(bandId: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (bandId) url.searchParams.set("band", bandId);
  else url.searchParams.delete("band");
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function BandProfileProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // True while the open modal has its own history entry, so closing can go back.
  const pushedRef = useRef(false);

  const open = useCallback((bandId: string, options: OpenOptions = {}) => {
    triggerRef.current = options.trigger ?? null;
    setSelection({
      bandId,
      originBandId: options.fromCard ? bandId : null,
      swapped: false,
    });
    writeBandParam(bandId, "push");
    pushedRef.current = true;
  }, []);

  // Jumping between similar bands replaces the entry, so Back closes the modal
  // instead of stepping through every band visited.
  const showBand = useCallback((bandId: string) => {
    setSelection((s) => (s ? { ...s, bandId, swapped: true } : s));
    writeBandParam(bandId, "replace");
  }, []);

  const close = useCallback(() => {
    setSelection(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      writeBandParam(null, "replace");
    }
  }, []);

  // The URL is the other way in: a shared link, a search result, or the Back
  // button all arrive here as a change to `?band=`.
  const urlBandId = useSearchParams().get("band");
  useEffect(() => {
    if (urlBandId && getBandById(urlBandId)) {
      setSelection((current) => {
        if (current?.bandId === urlBandId) return current;
        // Someone else changed the URL (search, a link), so the entry on top of
        // the history stack isn't ours to pop when closing.
        pushedRef.current = false;
        return { bandId: urlBandId, originBandId: null, swapped: false };
      });
    } else {
      pushedRef.current = false;
      setSelection((current) => (current ? null : current));
    }
  }, [urlBandId]);

  // Cards read `selectedBandId`, so they re-render together with the modal and
  // Framer Motion can snapshot them before the shared-element transition.
  const selectedBandId = selection?.bandId ?? null;
  const value = useMemo(
    () => ({ open, selectedBandId }),
    [open, selectedBandId],
  );

  const band = selection ? getBandById(selection.bandId) : undefined;

  return (
    // One spring for hover, layout and shared-element motion, so the card, the
    // panel and the photo that flies between them all settle together.
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
    >
      <LayoutGroup>
        <BandProfileContext.Provider value={value}>
          {children}
          <AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
            {selection && band && (
              <BandProfileModal
                key="band-profile"
                band={band}
                originBandId={selection.originBandId}
                swapped={selection.swapped}
                onClose={close}
                onSelectBand={showBand}
              />
            )}
          </AnimatePresence>
        </BandProfileContext.Provider>
      </LayoutGroup>
    </MotionConfig>
  );
}
