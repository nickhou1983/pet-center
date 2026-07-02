import Link from "next/link";

import PetCard from "@/components/PetCard";
import { CATEGORY_LABELS, GENDER_LABELS, SIZE_LABELS, SPECIES_LABELS } from "@/lib/pet-labels";
import { prisma } from "@/lib/prisma";
import {
  GENDERS,
  PET_CATEGORIES,
  PET_SIZES,
  SPECIES,
  type GenderValue,
  type PetCategoryValue,
  type PetSizeValue,
  type SpeciesValue,
} from "@/lib/pet-schema";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "浏览宠物 · Pet Center",
};

const PAGE_SIZE = 12;

interface SearchParams {
  category?: string;
  species?: string;
  size?: string;
  gender?: string;
  region?: string;
  page?: string;
}

export default async function PetsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // --- parse & validate filters from query string ---
  const rawCategory = params.category;
  const rawSpecies = params.species;
  const rawSize = params.size;
  const rawGender = params.gender;
  const rawRegion = params.region?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const category =
    rawCategory && (PET_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as PetCategoryValue)
      : undefined;
  const species =
    rawSpecies && (SPECIES as readonly string[]).includes(rawSpecies)
      ? (rawSpecies as SpeciesValue)
      : undefined;
  const size =
    rawSize && (PET_SIZES as readonly string[]).includes(rawSize)
      ? (rawSize as PetSizeValue)
      : undefined;
  const gender =
    rawGender && (GENDERS as readonly string[]).includes(rawGender)
      ? (rawGender as GenderValue)
      : undefined;

  const where: Prisma.PetWhereInput = { status: "ACTIVE" };
  if (category) where.category = category;
  if (species) where.species = species;
  if (size) where.size = size;
  if (gender) where.gender = gender;
  if (rawRegion) where.region = { contains: rawRegion, mode: "insensitive" };

  const [total, pets] = await Promise.all([
    prisma.pet.count({ where }),
    prisma.pet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        category: true,
        species: true,
        size: true,
        gender: true,
        status: true,
        name: true,
        breed: true,
        color: true,
        age: true,
        region: true,
        photos: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Build a query string that keeps existing params but updates the given key. */
  function buildQuery(updates: Record<string, string | undefined>) {
    const next: Record<string, string> = {};
    if (category) next.category = category;
    if (species) next.species = species;
    if (size) next.size = size;
    if (gender) next.gender = gender;
    if (rawRegion) next.region = rawRegion;
    if (page > 1) next.page = String(page);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined) {
        delete next[k];
      } else {
        next[k] = v;
      }
    });
    // Always reset to page 1 when a filter changes
    if (Object.keys(updates).some((k) => k !== "page")) {
      delete next.page;
    }
    const qs = new URLSearchParams(next).toString();
    return qs ? `/pets?${qs}` : "/pets";
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header nav */}
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-foreground/10 px-4 py-2 text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            ← 返回首页
          </Link>
          <Link
            href="/publish"
            className="rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
          >
            发布宠物信息
          </Link>
        </nav>

        <header className="mb-8 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">浏览宠物信息</h1>
          <p className="text-sm text-foreground/60">
            共 {total} 条{category ? `「${CATEGORY_LABELS[category]}」` : ""}信息
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* ── Sidebar filters ── */}
          <aside className="w-full shrink-0 space-y-6 lg:w-56">
            {/* Category */}
            <FilterGroup label="分类">
              <FilterPill
                label="全部"
                href={buildQuery({ category: undefined })}
                active={!category}
              />
              {PET_CATEGORIES.map((cat) => (
                <FilterPill
                  key={cat}
                  label={CATEGORY_LABELS[cat]}
                  href={buildQuery({ category: cat })}
                  active={category === cat}
                />
              ))}
            </FilterGroup>

            {/* Species */}
            <FilterGroup label="物种">
              <FilterPill
                label="全部"
                href={buildQuery({ species: undefined })}
                active={!species}
              />
              {SPECIES.map((sp) => (
                <FilterPill
                  key={sp}
                  label={SPECIES_LABELS[sp]}
                  href={buildQuery({ species: sp })}
                  active={species === sp}
                />
              ))}
            </FilterGroup>

            {/* Size */}
            <FilterGroup label="体型">
              <FilterPill
                label="全部"
                href={buildQuery({ size: undefined })}
                active={!size}
              />
              {PET_SIZES.map((sz) => (
                <FilterPill
                  key={sz}
                  label={SIZE_LABELS[sz]}
                  href={buildQuery({ size: sz })}
                  active={size === sz}
                />
              ))}
            </FilterGroup>

            {/* Gender */}
            <FilterGroup label="性别">
              <FilterPill
                label="全部"
                href={buildQuery({ gender: undefined })}
                active={!gender}
              />
              {GENDERS.map((g) => (
                <FilterPill
                  key={g}
                  label={GENDER_LABELS[g]}
                  href={buildQuery({ gender: g })}
                  active={gender === g}
                />
              ))}
            </FilterGroup>

            {/* Region search */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
                地区
              </p>
              <form action="/pets" method="get" className="flex gap-2">
                {category && <input type="hidden" name="category" value={category} />}
                {species && <input type="hidden" name="species" value={species} />}
                {size && <input type="hidden" name="size" value={size} />}
                {gender && <input type="hidden" name="gender" value={gender} />}
                <input
                  type="text"
                  name="region"
                  defaultValue={rawRegion}
                  placeholder="输入地区…"
                  className="min-w-0 flex-1 rounded-xl border border-foreground/15 bg-transparent px-3 py-2 text-sm placeholder-foreground/30 outline-none focus:border-foreground/40"
                />
                <button
                  type="submit"
                  className="rounded-xl border border-foreground/15 px-3 py-2 text-sm transition-colors hover:border-foreground/40"
                >
                  搜
                </button>
              </form>
              {rawRegion && (
                <Link
                  href={buildQuery({ region: undefined })}
                  className="text-xs text-foreground/50 underline underline-offset-2 hover:text-foreground"
                >
                  清除地区筛选
                </Link>
              )}
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 space-y-6">
            {/* Active filter chips */}
            {(category || species || size || gender || rawRegion) && (
              <div className="flex flex-wrap gap-2">
                {category && (
                  <ActiveFilterChip
                    label={`分类：${CATEGORY_LABELS[category]}`}
                    clearHref={buildQuery({ category: undefined })}
                  />
                )}
                {species && (
                  <ActiveFilterChip
                    label={`物种：${SPECIES_LABELS[species]}`}
                    clearHref={buildQuery({ species: undefined })}
                  />
                )}
                {size && (
                  <ActiveFilterChip
                    label={`体型：${SIZE_LABELS[size]}`}
                    clearHref={buildQuery({ size: undefined })}
                  />
                )}
                {gender && (
                  <ActiveFilterChip
                    label={`性别：${GENDER_LABELS[gender]}`}
                    clearHref={buildQuery({ gender: undefined })}
                  />
                )}
                {rawRegion && (
                  <ActiveFilterChip
                    label={`地区：${rawRegion}`}
                    clearHref={buildQuery({ region: undefined })}
                  />
                )}
                <Link
                  href="/pets"
                  className="rounded-full border border-foreground/15 px-3 py-1 text-xs text-foreground/50 transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  清除全部
                </Link>
              </div>
            )}

            {/* Card grid */}
            {pets.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pets.map((pet) => (
                  <li key={pet.id}>
                    <PetCard pet={pet} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-foreground/15 text-center">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-foreground/50">暂无符合条件的宠物信息</p>
                <Link
                  href="/pets"
                  className="rounded-full border border-foreground/20 px-4 py-1.5 text-xs text-foreground/60 transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  清除筛选条件
                </Link>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-4">
                {page > 1 && (
                  <Link
                    href={buildQuery({ page: String(page - 1) })}
                    className="rounded-full border border-foreground/15 px-4 py-2 text-sm transition-colors hover:border-foreground/30"
                  >
                    ← 上一页
                  </Link>
                )}
                <span className="text-sm text-foreground/50">
                  第 {page} / {totalPages} 页
                </span>
                {page < totalPages && (
                  <Link
                    href={buildQuery({ page: String(page + 1) })}
                    className="rounded-full border border-foreground/15 px-4 py-2 text-sm transition-colors hover:border-foreground/30"
                  >
                    下一页 →
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Small local sub-components ────────────────────────────────────────────────

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function ActiveFilterChip({
  label,
  clearHref,
}: {
  label: string;
  clearHref: string;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-xs text-foreground/70">
      {label}
      <Link
        href={clearHref}
        className="ml-0.5 text-foreground/40 transition-colors hover:text-foreground"
        aria-label={`清除 ${label}`}
      >
        ×
      </Link>
    </span>
  );
}
