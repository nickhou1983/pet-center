/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { CATEGORY_LABELS, SIZE_LABELS, SPECIES_LABELS } from "@/lib/pet-labels";
import type {
  PetCategoryValue,
  PetSizeValue,
  SpeciesValue,
} from "@/lib/pet-schema";

// A single hybrid-search result card (M6): thumbnail, category/species tags,
// title, key attributes, the overall match score, and — for fusion queries —
// the per-modality (image/text) similarity breakdown. The whole card links to
// the pet's detail page.

/** Shape of one result item returned by `POST /api/search`. */
export interface SearchResult {
  id: string;
  category: string;
  species: string;
  size: string | null;
  gender: string;
  name: string | null;
  breed: string | null;
  color: string | null;
  region: string | null;
  photos: string[];
  score: number;
  imageScore: number | null;
  textScore: number | null;
}

/** Format a `[0, 1]` score as a whole-number percentage, e.g. `0.873 -> "87%"`. */
export function scorePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export default function ResultCard({ result }: { result: SearchResult }) {
  const cover = result.photos[0];
  const categoryLabel =
    CATEGORY_LABELS[result.category as PetCategoryValue] ?? result.category;
  const speciesLabel =
    SPECIES_LABELS[result.species as SpeciesValue] ?? result.species;
  const sizeLabel = result.size
    ? (SIZE_LABELS[result.size as PetSizeValue] ?? result.size)
    : null;

  const title =
    result.name ?? [categoryLabel, speciesLabel].filter(Boolean).join(" · ");

  const meta = [result.breed, result.color, sizeLabel, result.region].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <Link
      href={`/pets/${result.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background transition-colors hover:border-foreground/30"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-foreground/5">
        {cover ? (
          <img
            src={cover}
            alt={`${title} 的照片`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-foreground/40">
            暂无照片
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-sm">
          匹配 {scorePercent(result.score)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-[11px] font-medium text-background">
            {categoryLabel}
          </span>
          <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-[11px] font-medium text-foreground/70">
            {speciesLabel}
          </span>
        </div>

        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
          {title}
        </h3>

        {meta.length > 0 ? (
          <p className="line-clamp-2 text-xs text-foreground/60">
            {meta.join(" · ")}
          </p>
        ) : null}

        {result.imageScore !== null || result.textScore !== null ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-1 text-[11px] text-foreground/50">
            {result.imageScore !== null ? (
              <span>图搜 {scorePercent(result.imageScore)}</span>
            ) : null}
            {result.textScore !== null ? (
              <span>文搜 {scorePercent(result.textScore)}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
