import { z } from "zod";

// Shared validation schema for publishing a pet (M5).
//
// This module is imported by BOTH the client publish form and the server
// `POST /api/pets` route so the two validate identically. It therefore must stay
// free of any Node-only imports (fs/path) — the authoritative filesystem
// resolution of an uploaded photo lives in the server-only `lib/pet-photos.ts`.
// The enum value tuples mirror the Prisma enums in `prisma/schema.prisma`.

/** Category values, mirroring the Prisma `PetCategory` enum. */
export const PET_CATEGORIES = ["REGISTERED", "LOST", "FOUND", "ADOPTION"] as const;
/** Species values, mirroring the Prisma `Species` enum. */
export const SPECIES = ["DOG", "CAT", "OTHER"] as const;
/** Size values, mirroring the Prisma `PetSize` enum. */
export const PET_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
/** Gender values, mirroring the Prisma `Gender` enum. */
export const GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;

export const petCategorySchema = z.enum(PET_CATEGORIES);
export const speciesSchema = z.enum(SPECIES);
export const petSizeSchema = z.enum(PET_SIZES);
export const genderSchema = z.enum(GENDERS);

export type PetCategoryValue = (typeof PET_CATEGORIES)[number];
export type SpeciesValue = (typeof SPECIES)[number];
export type PetSizeValue = (typeof PET_SIZES)[number];
export type GenderValue = (typeof GENDERS)[number];

/** Max number of photos accepted, aligned with the upload route's default. */
export const MAX_PHOTOS = 10;

/**
 * A public uploads path as returned by `POST /api/upload`, e.g.
 * `/uploads/<uuid>.jpg`. This is a lightweight, client-safe shape check; the
 * server independently resolves the path to a real file under the uploads
 * directory (see `lib/pet-photos.ts`) before reading it.
 */
export const uploadPathSchema = z
  .string()
  .regex(/^\/uploads\/[A-Za-z0-9._/-]+$/, "非法的图片路径");

/** Treat empty/whitespace-only strings as "not provided" for optional fields. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Optional short free-text field: trimmed, non-empty when present. */
const optionalText = (max = 200) =>
  z.preprocess(emptyToUndefined, z.string().trim().min(1).max(max).optional());

/** Optional age in whole years, coerced from the form's string input. */
const optionalAge = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number()
    .int("年龄必须是整数")
    .min(0, "年龄不能为负")
    .max(100, "年龄超出范围")
    .optional(),
);

/**
 * Validation schema for creating a pet. Required: `category`, `species`, and at
 * least one `photos` entry (the first photo is used to generate the CLIP image
 * embedding). Everything else is optional.
 */
export const createPetSchema = z.object({
  category: petCategorySchema,
  species: speciesSchema,
  size: petSizeSchema.optional(),
  gender: genderSchema.optional(),
  name: optionalText(),
  breed: optionalText(),
  color: optionalText(),
  age: optionalAge,
  region: optionalText(),
  description: optionalText(2000),
  contactName: optionalText(),
  contactPhone: optionalText(50),
  photos: z
    .array(uploadPathSchema)
    .min(1, "请至少上传 1 张图片")
    .max(MAX_PHOTOS, `最多上传 ${MAX_PHOTOS} 张图片`),
});

/** Parsed, validated input for creating a pet. */
export type CreatePetInput = z.infer<typeof createPetSchema>;
