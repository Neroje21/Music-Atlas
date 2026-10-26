"use client";

import { useState } from "react";
import type { Band } from "@/types/metal";

// A plain <img>: logos come in arbitrary aspect ratios and are served as-is,
// so callers size them with a height class and `w-auto`.
//
// Real logos load from another site, so if one ever fails the generated
// wordmark in public/placeholders/logos takes its place.
export function BandLogo({
  band,
  className,
  loading,
}: {
  band: Pick<Band, "id" | "name" | "logoUrl">;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const placeholder = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/placeholders/logos/${band.id}.svg`;
  const src = failedUrl === band.logoUrl ? placeholder : band.logoUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${band.name} logo`}
      loading={loading}
      onError={() => setFailedUrl(band.logoUrl)}
      className={`object-contain ${className ?? ""}`}
    />
  );
}
