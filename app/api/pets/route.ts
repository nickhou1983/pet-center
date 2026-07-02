import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getImageEmbedding } from "@/lib/clip";
import { resolvePhotoFile } from "@/lib/pet-photos";
import { createPetSchema, type CreatePetInput } from "@/lib/pet-schema";
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
