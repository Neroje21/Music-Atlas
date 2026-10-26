import type { AccentName } from "@/types/metal";

/*
 * Tailwind only generates classes it can see as complete strings, so every
 * accent spells its classes out in full rather than interpolating a colour name.
 */
export interface AccentClasses {
  /** Border colour on hover/focus. */
  border: string;
  /** Glow on hover/focus. */
  glow: string;
  /** Focus ring colour. */
  outline: string;
  /** Persistent ring marking a selected item. */
  ring: string;
  /** Accent-coloured text. */
  text: string;
  /** Vibe tag pill. */
  tag: string;
  /** Solid fill (buttons, progress bars). */
  solid: string;
  /** Tint at the bottom of image overlays. */
  wash: string;
}

export const accents: Record<AccentName, AccentClasses> = {
  blood: {
    border: "hover:border-blood-500 focus-visible:border-blood-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-blood-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-blood-500)]",
    outline: "focus-visible:outline-blood-500",
    ring: "ring-2 ring-blood-500",
    text: "text-blood-400",
    tag: "border-blood-500/40 bg-blood-700/20 text-blood-400",
    solid: "bg-blood-600",
    wash: "from-blood-700/60",
  },
  purple: {
    border: "hover:border-occult-500 focus-visible:border-occult-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-occult-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-occult-500)]",
    outline: "focus-visible:outline-occult-500",
    ring: "ring-2 ring-occult-500",
    text: "text-occult-400",
    tag: "border-occult-500/40 bg-occult-700/20 text-occult-400",
    solid: "bg-occult-600",
    wash: "from-occult-700/60",
  },
  steel: {
    border: "hover:border-steel-400 focus-visible:border-steel-400",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-steel-400)] focus-visible:shadow-[0_0_48px_-12px_var(--color-steel-400)]",
    outline: "focus-visible:outline-steel-400",
    ring: "ring-2 ring-steel-400",
    text: "text-steel-400",
    tag: "border-steel-500/40 bg-steel-700/30 text-steel-400",
    solid: "bg-steel-600",
    wash: "from-steel-700/60",
  },
  ember: {
    border: "hover:border-ember-500 focus-visible:border-ember-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-ember-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-ember-500)]",
    outline: "focus-visible:outline-ember-500",
    ring: "ring-2 ring-ember-500",
    text: "text-ember-400",
    tag: "border-ember-500/40 bg-ember-700/20 text-ember-400",
    solid: "bg-ember-600",
    wash: "from-ember-700/60",
  },
  amber: {
    border: "hover:border-amber-500 focus-visible:border-amber-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-amber-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-amber-500)]",
    outline: "focus-visible:outline-amber-500",
    ring: "ring-2 ring-amber-500",
    text: "text-amber-400",
    tag: "border-amber-500/40 bg-amber-700/20 text-amber-400",
    solid: "bg-amber-600",
    wash: "from-amber-700/60",
  },
  azure: {
    border: "hover:border-azure-500 focus-visible:border-azure-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-azure-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-azure-500)]",
    outline: "focus-visible:outline-azure-500",
    ring: "ring-2 ring-azure-500",
    text: "text-azure-400",
    tag: "border-azure-500/40 bg-azure-700/20 text-azure-400",
    solid: "bg-azure-600",
    wash: "from-azure-700/60",
  },
  jade: {
    border: "hover:border-jade-500 focus-visible:border-jade-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-jade-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-jade-500)]",
    outline: "focus-visible:outline-jade-500",
    ring: "ring-2 ring-jade-500",
    text: "text-jade-400",
    tag: "border-jade-500/40 bg-jade-700/20 text-jade-400",
    solid: "bg-jade-600",
    wash: "from-jade-700/60",
  },
  rose: {
    border: "hover:border-rose-500 focus-visible:border-rose-500",
    glow: "hover:shadow-[0_0_48px_-12px_var(--color-rose-500)] focus-visible:shadow-[0_0_48px_-12px_var(--color-rose-500)]",
    outline: "focus-visible:outline-rose-500",
    ring: "ring-2 ring-rose-500",
    text: "text-rose-400",
    tag: "border-rose-500/40 bg-rose-700/20 text-rose-400",
    solid: "bg-rose-600",
    wash: "from-rose-700/60",
  },
};
