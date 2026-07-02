import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getImageEmbedding, getTextEmbedding } from "@/lib/clip";
import { prisma } from "@/lib/prisma";
import {
  l2Normalize,
  resolveSearchMode,
  resolveSearchWeights,
  toBoundedPositiveInt,
} from "@/lib/search";
import { toVectorLiteral } from "@/lib/vector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_VALUES = ["REGISTERED", "LOST", "FOUND", "ADOPTION"] as const;
const SPECIES_VALUES = ["DOG", "CAT", "OTHER"] as const;
const SIZE_VALUES = ["SMALL", "MEDIUM", "LARGE"] as const;

type AllowedCategory = (typeof CATEGORY_VALUES)[number];
type AllowedSpecies = (typeof SPECIES_VALUES)[number];
type AllowedSize = (typeof SIZE_VALUES)[number];

interface SearchRow {
  id: string;
  category: AllowedCategory;
  species: AllowedSpecies;
  breed: string | null;
  color: string | null;
  size: AllowedSize | null;
  region: string | null;
  description: string | null;
  photos: string[];
  score: number;
  simImage: number | null;
  simText: number | null;
}

interface SearchInput {
  imageFile: File | null;
  imageUrl?: string;
  description?: string;
  category?: string;
  species?: string;
  breed?: string;
  color?: string;
  size?: string;
  region?: string;
  mode?: string;
  imageWeight?: string | number;
  textWeight?: string | number;
  page?: string | number;
  pageSize?: string | number;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toUpperOrUndefined(value: string | undefined): string | undefined {
  return value ? value.toUpperCase() : undefined;
}

function parseEnumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  field: string,
): T | undefined {
  if (!value) return undefined;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Invalid ${field} value: ${value}`);
}

async function parseInput(request: Request): Promise<SearchInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      imageFile: null,
      imageUrl: asTrimmedString(body.imageUrl),
      description: asTrimmedString(body.description),
      category: asTrimmedString(body.category),
      species: asTrimmedString(body.species),
      breed: asTrimmedString(body.breed),
      color: asTrimmedString(body.color),
      size: asTrimmedString(body.size),
      region: asTrimmedString(body.region),
      mode: asTrimmedString(body.mode),
      imageWeight: body.imageWeight as string | number | undefined,
      textWeight: body.textWeight as string | number | undefined,
      page: body.page as string | number | undefined,
      pageSize: body.pageSize as string | number | undefined,
    };
  }

  const formData = await request.formData();
  const imageEntry = formData.get("image");

  return {
    imageFile: imageEntry instanceof File ? imageEntry : null,
    imageUrl: asTrimmedString(formData.get("imageUrl")),
    description: asTrimmedString(formData.get("description")),
    category: asTrimmedString(formData.get("category")),
    species: asTrimmedString(formData.get("species")),
    breed: asTrimmedString(formData.get("breed")),
    color: asTrimmedString(formData.get("color")),
    size: asTrimmedString(formData.get("size")),
    region: asTrimmedString(formData.get("region")),
    mode: asTrimmedString(formData.get("mode")),
    imageWeight: (formData.get("imageWeight") as string | null) ?? undefined,
    textWeight: (formData.get("textWeight") as string | null) ?? undefined,
    page: (formData.get("page") as string | null) ?? undefined,
    pageSize: (formData.get("pageSize") as string | null) ?? undefined,
  };
}

export async function POST(request: Request) {
  try {
    const input = await parseInput(request);

    const category = parseEnumValue(
      toUpperOrUndefined(input.category),
      CATEGORY_VALUES,
      "category",
    );
    const species = parseEnumValue(
      toUpperOrUndefined(input.species),
      SPECIES_VALUES,
      "species",
    );
    const size = parseEnumValue(toUpperOrUndefined(input.size), SIZE_VALUES, "size");

    const hasImage =
      (input.imageFile !== null && input.imageFile.size > 0) || !!input.imageUrl;
    const hasText = !!input.description;
    const mode = resolveSearchMode({
      mode: toUpperOrUndefined(input.mode)?.toLowerCase(),
      hasImage,
      hasText,
    });
    const weights = resolveSearchWeights(mode, {
      imageWeight: input.imageWeight,
      textWeight: input.textWeight,
    });

    const page = toBoundedPositiveInt(input.page, 1, { min: 1, max: 1_000_000 });
    const pageSize = toBoundedPositiveInt(input.pageSize, 20, { min: 1, max: 100 });
    const offset = (page - 1) * pageSize;

    const imagePromise =
      mode === "image" || mode === "hybrid"
        ? input.imageFile
          ? input.imageFile
              .arrayBuffer()
              .then((arrayBuffer) => getImageEmbedding(new Uint8Array(arrayBuffer)))
          : getImageEmbedding(input.imageUrl!)
        : Promise.resolve<number[] | null>(null);

    const textPromise =
      mode === "text" || mode === "hybrid"
        ? getTextEmbedding(input.description!)
        : Promise.resolve<number[] | null>(null);

    const [imageEmbedding, textEmbedding] = await Promise.all([
      imagePromise,
      textPromise,
    ]);

    const imageVector = imageEmbedding ? l2Normalize(imageEmbedding) : null;
    const textVector = textEmbedding ? l2Normalize(textEmbedding) : null;

    const imageLiteral = imageVector ? toVectorLiteral(imageVector) : null;
    const textLiteral = textVector ? toVectorLiteral(textVector) : null;

    const conditions: Prisma.Sql[] = [Prisma.sql`"imageEmbedding" IS NOT NULL`];

    if (category) {
      conditions.push(Prisma.sql`"category" = ${category}::"PetCategory"`);
    }
    if (species) {
      conditions.push(Prisma.sql`"species" = ${species}::"Species"`);
    }
    if (size) {
      conditions.push(Prisma.sql`"size" = ${size}::"PetSize"`);
    }
    if (input.breed) {
      conditions.push(Prisma.sql`"breed" ILIKE ${`%${input.breed}%`}`);
    }
    if (input.color) {
      conditions.push(Prisma.sql`"color" ILIKE ${`%${input.color}%`}`);
    }
    if (input.region) {
      conditions.push(Prisma.sql`"region" ILIKE ${`%${input.region}%`}`);
    }

    let simImageExpr: Prisma.Sql;
    let simTextExpr: Prisma.Sql;
    let scoreExpr: Prisma.Sql;

    if (mode === "image") {
      simImageExpr = Prisma.sql`(1 - ("imageEmbedding" <=> ${imageLiteral!}::vector))`;
      simTextExpr = Prisma.sql`NULL::double precision`;
      scoreExpr = simImageExpr;
    } else if (mode === "text") {
      simImageExpr = Prisma.sql`NULL::double precision`;
      simTextExpr = Prisma.sql`(1 - ("imageEmbedding" <=> ${textLiteral!}::vector))`;
      scoreExpr = simTextExpr;
    } else {
      simImageExpr = Prisma.sql`(1 - ("imageEmbedding" <=> ${imageLiteral!}::vector))`;
      simTextExpr = Prisma.sql`(1 - ("imageEmbedding" <=> ${textLiteral!}::vector))`;
      scoreExpr = Prisma.sql`(
        ${weights.image} * ${simImageExpr}
        + ${weights.text} * ${simTextExpr}
      )`;
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const rows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT
        "id",
        "category",
        "species",
        "breed",
        "color",
        "size",
        "region",
        "description",
        "photos",
        ${simImageExpr} AS "simImage",
        ${simTextExpr} AS "simText",
        ${scoreExpr} AS "score"
      FROM "pets"
      ${whereSql}
      ORDER BY "score" DESC, "createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    const countRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "total"
      FROM "pets"
      ${whereSql}
    `);

    const total = Number(countRows[0]?.total ?? 0);

    return NextResponse.json({
      mode,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      weights,
      results: rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
