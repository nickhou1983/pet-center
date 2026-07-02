import { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { toVectorLiteral } from "./vector";

// Server-only hybrid search query builder + executor (M6).
//
// Ranks pets by CLIP similarity to a query image and/or query text. Both query
// vectors are compared against the SAME stored `imageEmbedding` column: CLIP is
// cross-modal, so a text vector and an image vector live in one space and are
// both meaningfully close to a pet's image embedding. Similarity uses pgvector's
// cosine-distance operator `<=>` (score = 1 - distance), matching the ivfflat
// `vector_cosine_ops` index and the L2-normalized vectors written at ingest.
//
// The `imageEmbedding` column is `Unsupported("vector(512)")` in the Prisma
// schema, so everything here goes through `$queryRaw`. All caller values are
// interpolated as `Prisma.sql` parameters (never string-concatenated) to keep
// the query injection-safe. Vectors are passed as the pgvector text literal with
// an explicit `::vector` cast (see lib/vector.ts).
//
// Index note: for the fusion case the ranking is `ORDER BY <computed score>
// DESC`, an expression over two distances, so the ivfflat index (which only
// accelerates the bare `ORDER BY col <=> $v` ascending form) is not used and the
// planner falls back to a scan + sort. That is acceptable for the prototype's
// data volume and is bounded by the `LIMIT`; a future optimization could route
// the single-vector modes through the indexed operator form.

/** Attribute filters applied as an additional `WHERE` predicate. */
export interface SearchFilters {
  category?: string;
  species?: string;
  size?: string;
  gender?: string;
  breed?: string;
  color?: string;
  region?: string;
}

/** One ranked search hit: the pet's card fields plus similarity scores. */
export interface HybridSearchRow {
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
  /** Fused (or single-modality) rank score = weighted sum of the similarities. */
  score: number;
  /** Image-query similarity (1 - cosine distance), or null when no query image. */
  imageScore: number | null;
  /** Text-query similarity (1 - cosine distance), or null when no query text. */
  textScore: number | null;
}

export interface HybridSearchParams {
  /** Query image embedding (L2-normalized, 512-dim), or null to skip image ranking. */
  imageVector: number[] | null;
  /** Query text embedding (L2-normalized, 512-dim), or null to skip text ranking. */
  textVector: number[] | null;
  /** Effective image weight (already resolved/normalized by `resolveWeights`). */
  wImage: number;
  /** Effective text weight (already resolved/normalized by `resolveWeights`). */
  wText: number;
  filters: SearchFilters;
  limit: number;
  offset: number;
}

/** Escape LIKE/ILIKE wildcards so free-text filters match literally (`\` default escape). */
function likeContains(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

/**
 * Build the list of additional `WHERE` conditions from attribute filters. Each
 * fragment is `AND`-prefixed so it composes onto the built-in
 * `WHERE "imageEmbedding" IS NOT NULL` clause. Enum columns use an exact match
 * with an explicit type cast; free-text columns use case-insensitive substring
 * matching. Every value is parameterized via `Prisma.sql`.
 */
export function buildFilterConditions(filters: SearchFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];

  if (filters.category) {
    conditions.push(Prisma.sql`AND "category" = ${filters.category}::"PetCategory"`);
  }
  if (filters.species) {
    conditions.push(Prisma.sql`AND "species" = ${filters.species}::"Species"`);
  }
  if (filters.size) {
    conditions.push(Prisma.sql`AND "size" = ${filters.size}::"PetSize"`);
  }
  if (filters.gender) {
    conditions.push(Prisma.sql`AND "gender" = ${filters.gender}::"Gender"`);
  }
  if (filters.breed) {
    conditions.push(Prisma.sql`AND "breed" ILIKE ${likeContains(filters.breed)}`);
  }
  if (filters.color) {
    conditions.push(Prisma.sql`AND "color" ILIKE ${likeContains(filters.color)}`);
  }
  if (filters.region) {
    conditions.push(Prisma.sql`AND "region" ILIKE ${likeContains(filters.region)}`);
  }

  return conditions;
}

/** Join filter conditions into a single fragment (or empty when none apply). */
function filterClause(filters: SearchFilters): Prisma.Sql {
  const conditions = buildFilterConditions(filters);
  return conditions.length > 0 ? Prisma.join(conditions, " ") : Prisma.empty;
}

/** SQL for a modality's similarity (`1 - cosine distance`) from a vector literal. */
function similaritySql(vector: number[]): Prisma.Sql {
  const literal = toVectorLiteral(vector);
  return Prisma.sql`(1 - ("imageEmbedding" <=> ${literal}::vector))`;
}

/**
 * Rank pets by similarity to the query image and/or text, scoped by attribute
 * filters, ordered by descending fused score, with `LIMIT`/`OFFSET` paging.
 * Requires at least one of `imageVector` / `textVector`.
 */
export async function hybridSearch(
  params: HybridSearchParams,
): Promise<HybridSearchRow[]> {
  const { imageVector, textVector, wImage, wText, filters, limit, offset } = params;

  const imageSim = imageVector ? similaritySql(imageVector) : null;
  const textSim = textVector ? similaritySql(textVector) : null;

  let scoreSql: Prisma.Sql;
  if (imageSim && textSim) {
    scoreSql = Prisma.sql`(${wImage} * ${imageSim} + ${wText} * ${textSim})`;
  } else if (imageSim) {
    scoreSql = imageSim;
  } else if (textSim) {
    scoreSql = textSim;
  } else {
    throw new Error("hybridSearch requires at least one query vector.");
  }

  const imageScoreSelect = imageSim ?? Prisma.sql`NULL`;
  const textScoreSelect = textSim ?? Prisma.sql`NULL`;

  return prisma.$queryRaw<HybridSearchRow[]>`
    SELECT
      "id", "category", "species", "size", "gender",
      "name", "breed", "color", "region", "photos",
      ${scoreSql} AS "score",
      ${imageScoreSelect} AS "imageScore",
      ${textScoreSelect} AS "textScore"
    FROM "pets"
    WHERE "imageEmbedding" IS NOT NULL
    ${filterClause(filters)}
    ORDER BY "score" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

/**
 * Count pets that match the attribute filters and have an embedding — the total
 * used for pagination. Uses the same `WHERE` as {@link hybridSearch} (minus the
 * vector ranking) so the count is consistent with the paged results.
 */
export async function countMatches(filters: SearchFilters): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "pets"
    WHERE "imageEmbedding" IS NOT NULL
    ${filterClause(filters)}
  `;
  return Number(rows[0]?.count ?? 0);
}
