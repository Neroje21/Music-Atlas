import type { Metadata } from "next";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { atlases } from "@/lib/atlases";

export const metadata: Metadata = {
  title: atlases.metal.name,
  description: atlases.metal.description,
};

export default function MetalLayout({ children }: LayoutProps<"/metal">) {
  return <AtlasShell atlas="metal">{children}</AtlasShell>;
}
