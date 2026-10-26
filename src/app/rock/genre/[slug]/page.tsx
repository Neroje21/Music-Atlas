import { AtlasGenrePage } from "@/components/atlas/AtlasGenrePage";
import { getAtlasSubgenres } from "@/lib/bands";

export function generateStaticParams() {
  return getAtlasSubgenres("rock").map((s) => ({ slug: s.slug }));
}

export default function RockGenrePage({ params }: PageProps<"/rock/genre/[slug]">) {
  return <AtlasGenrePage atlas="rock" params={params} />;
}
