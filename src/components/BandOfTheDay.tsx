"use client";

import { useSyncExternalStore } from "react";
import { dayNumber, pickBandOfTheDay } from "@/lib/band-of-the-day";
import type { AccentName } from "@/types/metal";
import {
  HeroBandOfTheDay,
  HeroBandOfTheDaySkeleton,
  type HeroBand,
} from "./HeroBandOfTheDay";

const subscribe = () => () => {};
const today = () => dayNumber(Date.now());

// The pick depends on the visitor's clock, so it is made in the browser: the
// server snapshot is null (a skeleton), which keeps the page prerenderable and
// lets it be hosted as plain static files.
export function BandOfTheDay({
  bands,
  accent,
}: {
  bands: HeroBand[];
  accent: AccentName;
}) {
  const day = useSyncExternalStore(subscribe, today, () => null);
  if (day === null) return <HeroBandOfTheDaySkeleton />;
  return <HeroBandOfTheDay band={pickBandOfTheDay(bands, day)} accent={accent} />;
}
