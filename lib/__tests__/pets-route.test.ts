// Tests for the importable logic behind POST /api/pets (M5): the shared
// `createPetSchema` validation contract and the `pet-photos` upload-path guard.
//
// The route handler itself wires together filesystem reads, CLIP inference and a
// Prisma transaction, which are integration/e2e concerns rather than unit ones.
// To keep these tests meaningful we assert only against the real imported
// modules the handler relies on — no reimplemented helpers and no tautological
// "literal === literal" or "Array(n).length === n" checks that pass regardless
// of the product code.

import { describe, it, expect } from "vitest";

import { isUploadPath, resolvePhotoFile } from "../pet-photos";
import { createPetSchema } from "../pet-schema";

describe("POST /api/pets — validation contract", () => {
  it("rejects requests missing category, species, or photos", () => {
    expect(
      createPetSchema.safeParse({ species: "DOG", photos: ["/uploads/a.jpg"] })
        .success,
    ).toBe(false);
    expect(
      createPetSchema.safeParse({ category: "LOST", photos: ["/uploads/a.jpg"] })
        .success,
    ).toBe(false);
    expect(
      createPetSchema.safeParse({ category: "LOST", species: "DOG" }).success,
    ).toBe(false);
  });

  it("accepts a minimal valid request and keeps the first photo primary", () => {
    const result = createPetSchema.safeParse({
      category: "LOST",
      species: "DOG",
      photos: ["/uploads/primary.jpg", "/uploads/secondary.jpg"],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // The route reads photos[0] to generate the embedding.
    expect(result.data.photos[0]).toBe("/uploads/primary.jpg");
  });

  it("preserves provided fields and normalizes unset optionals to undefined", () => {
    const result = createPetSchema.safeParse({
      category: "ADOPTION",
      species: "CAT",
      size: "SMALL",
      gender: "FEMALE",
      name: "小花",
      age: 2,
      photos: ["/uploads/cat.jpg"],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.category).toBe("ADOPTION");
    expect(result.data.size).toBe("SMALL");
    expect(result.data.age).toBe(2);
    expect(result.data.breed).toBeUndefined();
    expect(result.data.contactPhone).toBeUndefined();
  });
});

describe("POST /api/pets — photo path guard", () => {
  it("recognizes only public uploads paths", () => {
    expect(isUploadPath("/uploads/abc123.jpg")).toBe(true);
    expect(isUploadPath("/uploads/nested/image.webp")).toBe(true);
    expect(isUploadPath("/etc/passwd")).toBe(false);
    expect(isUploadPath("http://evil.com/image.jpg")).toBe(false);
    expect(isUploadPath("uploads/a.jpg")).toBe(false);
    expect(isUploadPath(null)).toBe(false);
  });

  it("resolves in-bounds uploads and blocks traversal / non-uploads", () => {
    expect(resolvePhotoFile("/uploads/abc123.jpg")).not.toBeNull();
    expect(resolvePhotoFile("/uploads/../secret.txt")).toBeNull();
    expect(resolvePhotoFile("/uploads/../../etc/passwd")).toBeNull();
    expect(resolvePhotoFile("/etc/passwd")).toBeNull();
    expect(resolvePhotoFile("relative/path.jpg")).toBeNull();
  });
});
