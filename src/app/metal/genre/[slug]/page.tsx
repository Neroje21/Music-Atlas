import { AtlasGenrePage } from "@/components/atlas/AtlasGenrePage";
import { getAtlasSubgenres } from "@/lib/bands";

export function generateStaticParams() {
  return getAtlasSubgenres("metal").map((s) => ({ slug: s.slug }));
}

export default function MetalGenrePage({ params }: PageProps<"/metal/genre/[slug]">) {
  return <AtlasGenrePage atlas="metal" params={params} />;
}
