import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getImageEmbedding, getTextEmbedding } from "@/lib/clip";
import {
  countMatches,
  hybridSearch,
  type SearchFilters,
} from "@/lib/pet-search";
import { resolvePhotoFile } from "@/lib/pet-photos";
import {
  resolveWeights,
  roundScore,
  searchRequestSchema,
  type SearchRequestInput,
} from "@/lib/search-schema";

// POST /api/search flow: validate JSON → generate query vectors (image and/or
// text) with CLIP → run the filtered hybrid similarity search → return scored,
// paginated results. Both query vectors are matched against the stored image
// embeddings (CLIP is cross-modal). Vectors are generated before hitting the DB
// because model inference is slow; the ranking/paging runs in SQL so ORDER BY
// and LIMIT/OFFSET stay correct (see lib/pet-search.ts). transformers.js needs
// native Node addons, so this route runs on the Node.js runtime.
export const runtime = "nodejs";

function errorResponse(
  status: number,
  code: string,
  error: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ error, code, ...details }, { status });
}

/** Turn a nullable similarity into a rounded score, or null when absent. */
function toScore(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : roundScore(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "请求体必须是 JSON");
  }

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return errorResponse(400, "VALIDATION_ERROR", "校验失败", {
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
  }

  const data: SearchRequestInput = parsed.data;
  const hasImage = Boolean(data.photo);
  const hasText = Boolean(data.description);

  // Query image vector: resolve the uploads path safely, read the bytes, embed.
  let imageVector: number[] | null = null;
  if (data.photo) {
    const filePath = resolvePhotoFile(data.photo);
    if (filePath === null) {
      return errorResponse(400, "INVALID_PHOTO", "图片路径无效");
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch {
      return errorResponse(404, "PHOTO_NOT_FOUND", "图片未找到");
    }

    try {
      imageVector = await getImageEmbedding(buffer);
    } catch (error) {
      console.error("[POST /api/search] image embedding failed:", error);
      return errorResponse(502, "EMBEDDING_FAILED", "向量生成失败，请稍后重试");
    }
  }

  // Query text vector.
  let textVector: number[] | null = null;
  if (data.description) {
    try {
      textVector = await getTextEmbedding(data.description);
    } catch (error) {
      console.error("[POST /api/search] text embedding failed:", error);
      return errorResponse(502, "EMBEDDING_FAILED", "向量生成失败，请稍后重试");
    }
  }

  const weights = resolveWeights({
    hasImage,
    hasText,
    wImage: data.wImage,
    wText: data.wText,
  });

  const filters: SearchFilters = {
    category: data.category,
    species: data.species,
    size: data.size,
    gender: data.gender,
    breed: data.breed,
    color: data.color,
    region: data.region,
  };

  const { page, pageSize } = data;
  const offset = (page - 1) * pageSize;

  try {
    const [rows, total] = await Promise.all([
      hybridSearch({
        imageVector,
        textVector,
        wImage: weights.image,
        wText: weights.text,
        filters,
        limit: pageSize,
        offset,
      }),
      countMatches(filters),
    ]);

    const results = rows.map((row) => ({
      id: row.id,
      category: row.category,
      species: row.species,
      size: row.size,
      gender: row.gender,
      name: row.name,
      breed: row.breed,
      color: row.color,
      region: row.region,
      photos: row.photos ?? [],
      score: roundScore(row.score),
      imageScore: toScore(row.imageScore),
      textScore: toScore(row.textScore),
    }));

    return NextResponse.json({
      mode: weights.mode,
      weights: {
        image: roundScore(weights.image),
        text: roundScore(weights.text),
      },
      page,
      pageSize,
      total,
      results,
    });
  } catch (error) {
    console.error("[POST /api/search] search query failed:", error);
    return errorResponse(500, "DB_ERROR", "搜索失败，请稍后重试");
  }
}
