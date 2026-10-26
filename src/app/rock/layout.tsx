import type { Metadata } from "next";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { atlases } from "@/lib/atlases";

export const metadata: Metadata = {
  title: atlases.rock.name,
  description: atlases.rock.description,
};

export default function RockLayout({ children }: LayoutProps<"/rock">) {
  return <AtlasShell atlas="rock">{children}</AtlasShell>;
}
