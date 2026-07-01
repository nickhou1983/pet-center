import { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

// pgvector helpers.
//
// The `imageEmbedding` column is declared as `Unsupported("vector(512)")` in
// the Prisma schema, so it is NOT available on the generated Prisma Client and
// cannot be read/written through normal `prisma.pet.*` calls. Use the helpers
// below, which go through `$executeRaw` / `$queryRaw`. Vectors are passed as the
// pgvector text literal `[0.1,0.2,...]` with an explicit `::vector` cast, and
// similarity uses the cosine-distance operator `<=>` (matching the ivfflat
// `vector_cosine_ops` index created in the migration).

/** CLIP image/text embedding dimension. */
export const EMBEDDING_DIM = 512;

/**
 * Serialize a numeric embedding into the pgvector text literal `[0.1,0.2,...]`.
 * Throws on the wrong dimension or non-finite values so bad data never reaches
 * the database.
 */
export function toVectorLiteral(vector: number[]): string {
  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Expected embedding of length ${EMBEDDING_DIM}, received ${vector.length}.`,
    );
  }
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contains a non-finite value.");
    }
  }
  return `[${vector.join(",")}]`;
}

/**
 * Parse a pgvector text value `[0.1,0.2,...]` (as returned by a raw query) back
 * into a number[].
 */
export function parseVectorLiteral(value: string): number[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error(`Invalid vector literal: ${value}`);
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner.split(",").map((part) => Number(part));
}

/**
 * Write (or clear) a pet's image embedding via raw SQL. Pass `null` to clear.
 */
export async function setImageEmbedding(
  id: string,
  vector: number[] | null,
): Promise<void> {
  if (vector === null) {
    await prisma.$executeRaw`UPDATE "pets" SET "imageEmbedding" = NULL WHERE "id" = ${id}`;
    return;
  }
  const literal = toVectorLiteral(vector);
  await prisma.$executeRaw`UPDATE "pets" SET "imageEmbedding" = ${literal}::vector WHERE "id" = ${id}`;
}

/** A nearest-neighbour search hit. `distance` is cosine distance in `[0, 2]`. */
export interface EmbeddingMatch {
  id: string;
  distance: number;
}

/**
 * Find the pets whose image embedding is closest to `vector` by cosine
 * distance. Optionally scope the search with `andFilter`: an additional
 * predicate that is composed onto the built-in `WHERE "imageEmbedding" IS NOT
 * NULL` clause, so it MUST be `AND`-prefixed. Build it with `Prisma.sql` to
 * keep values parameterized, e.g.
 * `` Prisma.sql`AND "species" = ${species}::"Species"` ``.
 */
export async function findNearestByEmbedding(
  vector: number[],
  limit = 10,
  andFilter?: Prisma.Sql,
): Promise<EmbeddingMatch[]> {
  const literal = toVectorLiteral(vector);
  const filter = andFilter ?? Prisma.empty;
  const rows = await prisma.$queryRaw<EmbeddingMatch[]>`
    SELECT "id", ("imageEmbedding" <=> ${literal}::vector) AS "distance"
    FROM "pets"
    WHERE "imageEmbedding" IS NOT NULL
    ${filter}
    ORDER BY "imageEmbedding" <=> ${literal}::vector
    LIMIT ${limit}
  `;
  return rows;
}
