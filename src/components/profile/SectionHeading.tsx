import type { ReactNode } from "react";

export function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h3 id={id} className="font-display text-2xl text-white sm:text-3xl">
      {children}
    </h3>
  );
}
