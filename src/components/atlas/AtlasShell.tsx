import type { ReactNode } from "react";
import type { AtlasId } from "@/types/metal";
import { SiteFooter } from "../SiteFooter";

/**
 * Wraps every page of an atlas. `data-atlas` switches the display font (see
 * globals.css), and the footer lists that atlas's subgenres.
 */
export function AtlasShell({ atlas, children }: { atlas: AtlasId; children: ReactNode }) {
  return (
    <div data-atlas={atlas} className="flex flex-1 flex-col">
      <main className="flex-1">{children}</main>
      <SiteFooter atlas={atlas} />
    </div>
  );
}
