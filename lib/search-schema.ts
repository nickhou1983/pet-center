import { z } from "zod";

import {
  genderSchema,
  petCategorySchema,
  petSizeSchema,
  speciesSchema,
  uploadPathSchema,
} from "./pet-schema";

// Shared validation + scoring helpers for hybrid search (M6).
//
// Imported by BOTH the client search form and the server `POST /api/search`
// route so the two validate identically. Like `lib/pet-schema.ts`, it MUST stay
// free of any Node-only imports (fs/path) — the server-only pieces (CLIP
// inference, filesystem photo resolution, raw SQL) live elsewhere. The enum
// value schemas are reused from `pet-schema.ts`, so they never drift from the
// Prisma enums.

/** Default fusion weight for each modality when both photo and text are given. */
export const DEFAULT_WEIGHT = 0.5;
/** Default page size for search results. */
export const DEFAULT_PAGE_SIZE = 20;
/** Upper bound on page size so a caller can't request an unbounded result set. */
export const MAX_PAGE_SIZE = 50;
/** Max length of the free-text query description. */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** Treat `null` and empty/whitespace-only strings as "not provided". */
const emptyToUndefined = (value: unknown) =>
  value === null || (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;

/** Optional short free-text filter: trimmed, non-empty when present. */
const optionalText = (max = 200) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(1).max(max).optional());

/** Optional enum filter that treats empty string / null as "not provided". */
const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

/** A fusion weight in `[0, 1]`, defaulting to {@link DEFAULT_WEIGHT}. */
const weightSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .min(0, "权重不能为负")
    .max(1, "权重不能超过 1")
    .default(DEFAULT_WEIGHT),
);

const pageSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int("页码必须是整数").min(1, "页码从 1 开始").default(1),
);

const pageSizeSchema = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .int("每页数量必须是整数")
    .min(1, "每页至少 1 条")
    .max(MAX_PAGE_SIZE, `每页最多 ${MAX_PAGE_SIZE} 条`)
    .default(DEFAULT_PAGE_SIZE),
);

/**
 * Validation schema for a hybrid-search request. `photo` (a `/uploads/*` path
 * from `POST /api/upload`) and `description` are both optional individually, but
 * at least one must be provided — that's what gives the query a vector to match
 * against. Everything else (weights, attribute filters, pagination) is optional
 * with sensible defaults.
 */
export const searchRequestSchema = z
  .object({
    photo: z.preprocess(emptyToUndefined, uploadPathSchema.optional()),
    description: optionalText(MAX_DESCRIPTION_LENGTH),
    wImage: weightSchema,
    wText: weightSchema,
    category: optionalEnum(petCategorySchema),
    species: optionalEnum(speciesSchema),
    size: optionalEnum(petSizeSchema),
    gender: optionalEnum(genderSchema),
    breed: optionalText(),
    color: optionalText(),
    region: optionalText(),
    page: pageSchema,
    pageSize: pageSizeSchema,
  })
  .refine((data) => Boolean(data.photo) || Boolean(data.description), {
    message: "请上传照片或填写描述（至少其一）",
  });

/** Parsed, validated input for a search request. */
export type SearchRequestInput = z.infer<typeof searchRequestSchema>;

/** Which modalities drive the ranking for a given request. */
export type SearchMode = "image" | "text" | "fusion";

/** Effective (post-resolution) weights and the resulting search mode. */
export interface WeightResolution {
  image: number;
  text: number;
  mode: SearchMode;
}

/**
 * Decide the effective per-modality weights (and the search mode) from which
 * inputs are present. When only one modality is supplied the search degrades to
 * pure image or pure text ranking; when both are supplied the caller-provided
 * weights are normalized to sum to 1 so the fused score stays comparable to the
 * single-modality similarities. If both weights are zero (or absent) it falls
 * back to an even split.
 */
export function resolveWeights(input: {
  hasImage: boolean;
  hasText: boolean;
  wImage?: number;
  wText?: number;
}): WeightResolution {
  const { hasImage, hasText } = input;

  if (hasImage && !hasText) return { image: 1, text: 0, mode: "image" };
  if (hasText && !hasImage) return { image: 0, text: 1, mode: "text" };
  if (!hasImage && !hasText) return { image: 0, text: 0, mode: "fusion" };

  const wImage = Math.max(0, input.wImage ?? DEFAULT_WEIGHT);
  const wText = Math.max(0, input.wText ?? DEFAULT_WEIGHT);
  const total = wImage + wText;
  if (total <= 0) {
    return { image: DEFAULT_WEIGHT, text: DEFAULT_WEIGHT, mode: "fusion" };
  }
  return { image: wImage / total, text: wText / total, mode: "fusion" };
}

/**
 * Clamp a raw similarity/score into `[0, 1]` for display. Cosine similarity of
 * L2-normalized vectors is in `[-1, 1]`; for the matches surfaced here it is
 * effectively `[0, 1]`, but clamping keeps the reported score well-formed even
 * for weakly/negatively correlated results (and guards against NaN).
 */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** {@link clampScore} then round to `digits` decimals (default 4) for the API. */
export function roundScore(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(clampScore(value) * factor) / factor;
}
