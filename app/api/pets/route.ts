import { readFile } from "node:fs/promises";

import { type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getImageEmbedding } from "@/lib/clip";
import { resolvePhotoFile } from "@/lib/pet-photos";
import {
  createPetSchema,
  type CreatePetInput,
  PET_CATEGORIES,
  SPECIES,
  PET_SIZES,
  GENDERS,
  type PetCategoryValue,
  type SpeciesValue,
  type PetSizeValue,
  type GenderValue,
} from "@/lib/pet-schema";
import { prisma } from "@/lib/prisma";
import { EMBEDDING_DIM, toVectorLiteral } from "@/lib/vector";

// POST /api/pets flow: validate JSON, resolve/read the first uploaded photo,
// generate its CLIP embedding, then atomically insert the pet and write the
// vector. Embedding is generated before opening the transaction because model
// inference is slow; the vector is written via raw SQL because Prisma marks the
// pgvector column as Unsupported("vector(512)") and cannot include it in create().
export const runtime = "nodejs";

function errorResponse(
  status: number,
  code: string,
  error: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ error, code, ...details }, { status });
}

/** Maximum results per page for GET /api/pets. */
const MAX_PAGE_SIZE = 50;
/** Default results per page for GET /api/pets. */
const DEFAULT_PAGE_SIZE = 12;

const PET_STATUSES = ["ACTIVE", "RESOLVED", "ARCHIVED"] as const;
type PetStatusValue = (typeof PET_STATUSES)[number];

/**
 * GET /api/pets — list pets with optional filters and pagination.
 *
 * Query parameters (all optional):
 *  - `category`  — one of REGISTERED / LOST / FOUND / ADOPTION
 *  - `species`   — one of DOG / CAT / OTHER
 *  - `size`      — one of SMALL / MEDIUM / LARGE
 *  - `gender`    — one of MALE / FEMALE / UNKNOWN
 *  - `region`    — free text; matches pets whose region contains the value (case-insensitive)
 *  - `status`    — one of ACTIVE / RESOLVED / ARCHIVED (default: ACTIVE)
 *  - `page`      — 1-based page number (default: 1)
 *  - `pageSize`  — items per page, capped at 50 (default: 12)
 *
 * Returns `{ pets, pagination: { total, page, pageSize, totalPages } }`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // --- parse and validate enum filters ---
  const rawCategory = searchParams.get("category");
  const rawSpecies = searchParams.get("species");
  const rawSize = searchParams.get("size");
  const rawGender = searchParams.get("gender");
  const rawStatus = searchParams.get("status") ?? "ACTIVE";
  const rawRegion = searchParams.get("region");

  // --- parse pagination ---
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.PetWhereInput = {};

  if (rawCategory && (PET_CATEGORIES as readonly string[]).includes(rawCategory)) {
    where.category = rawCategory as PetCategoryValue;
  }
  if (rawSpecies && (SPECIES as readonly string[]).includes(rawSpecies)) {
    where.species = rawSpecies as SpeciesValue;
  }
  if (rawSize && (PET_SIZES as readonly string[]).includes(rawSize)) {
    where.size = rawSize as PetSizeValue;
  }
  if (rawGender && (GENDERS as readonly string[]).includes(rawGender)) {
    where.gender = rawGender as GenderValue;
  }
  if (rawStatus && (PET_STATUSES as readonly string[]).includes(rawStatus)) {
    where.status = rawStatus as PetStatusValue;
  }
  if (rawRegion && rawRegion.trim()) {
    where.region = { contains: rawRegion.trim(), mode: "insensitive" };
  }

  try {
    const [total, pets] = await Promise.all([
      prisma.pet.count({ where }),
      prisma.pet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

    return NextResponse.json({
      pets,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch {
    return errorResponse(500, "DB_ERROR", "获取宠物列表失败，请稍后重试");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "请求体必须是 JSON");
  }

  const parsed = createPetSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "校验失败", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const data: CreatePetInput = parsed.data;
  const filePath = resolvePhotoFile(data.photos[0]);
  if (filePath === null) {
    return errorResponse(400, "INVALID_PHOTO", "图片路径无效");
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return errorResponse(404, "PHOTO_NOT_FOUND", "图片未找到");
  }

  let literal: string;
  try {
    const vector = await getImageEmbedding(buffer);
    // toVectorLiteral validates the dimension (and rejects non-finite values),
    // so there is no separate length check to keep in sync here.
    literal = toVectorLiteral(vector);
  } catch (error) {
    // Log the underlying cause server-side but never return it to the client:
    // it can expose file paths, dependency versions, or stack details.
    console.error("[POST /api/pets] embedding generation failed:", error);
    return errorResponse(502, "EMBEDDING_FAILED", "向量生成失败，请稍后重试");
  }

  try {
    const pet = await prisma.$transaction(async (tx) => {
      const created = await tx.pet.create({
        data: {
          category: data.category,
          species: data.species,
          size: data.size,
          gender: data.gender,
          name: data.name,
          breed: data.breed,
          color: data.color,
          age: data.age,
          region: data.region,
          description: data.description,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          photos: data.photos,
        },
      });

      await tx.$executeRaw`UPDATE "pets" SET "imageEmbedding" = ${literal}::vector WHERE "id" = ${created.id}`;
      return created;
    });

    return NextResponse.json(
      {
        id: pet.id,
        category: pet.category,
        species: pet.species,
        photos: pet.photos,
        embeddingDim: EMBEDDING_DIM,
      },
      { status: 201 },
    );
  } catch {
    return errorResponse(500, "DB_ERROR", "保存宠物信息失败，请稍后重试");
  }
}
