/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { formatAge } from "@/lib/pet-detail";
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
} from "@/lib/pet-labels";
import type {
  GenderValue,
  PetCategoryValue,
  PetSizeValue,
  SpeciesValue,
} from "@/lib/pet-schema";

export interface PetCardData {
  id: string;
  category: PetCategoryValue;
  species: SpeciesValue;
  size?: PetSizeValue | null;
  gender?: GenderValue | null;
  name?: string | null;
  breed?: string | null;
  color?: string | null;
  age?: number | null;
  region?: string | null;
  photos: string[];
  createdAt: Date | string;
}

interface PetCardProps {
  pet: PetCardData;
}

/**
 * Shared card component used on the list page (`/pets`) and the homepage (`/`).
 * Renders a thumbnail, category/species badge, title, and key attributes.
 */
export default function PetCard({ pet }: PetCardProps) {
  const cover = pet.photos[0] ?? null;
  const categoryLabel = CATEGORY_LABELS[pet.category];
  const speciesLabel = SPECIES_LABELS[pet.species];
  const title =
    pet.name ?? [categoryLabel, speciesLabel].filter(Boolean).join(" · ");

  const meta: string[] = [];
  if (pet.region) meta.push(pet.region);
  if (pet.breed) meta.push(pet.breed);
  if (pet.size) meta.push(SIZE_LABELS[pet.size]);
  if (pet.gender && pet.gender !== "UNKNOWN") meta.push(GENDER_LABELS[pet.gender]);
  const ageStr = formatAge(pet.age);
  if (ageStr) meta.push(ageStr);

  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-background transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-foreground/5">
        {cover ? (
          <img
            src={cover}
            alt={`${title} 的照片`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-foreground/20">
            🐾
          </div>
        )}
        {/* Category badge */}
        <span className="absolute left-3 top-3 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">
          {categoryLabel}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs font-medium text-foreground/70">
            {speciesLabel}
          </span>
        </div>
        <p className="line-clamp-1 text-sm font-semibold text-foreground">{title}</p>
        {meta.length > 0 && (
          <p className="line-clamp-1 text-xs text-foreground/50">{meta.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}
