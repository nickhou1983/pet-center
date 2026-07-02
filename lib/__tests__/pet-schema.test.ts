import { describe, expect, it } from "vitest";

import { createPetSchema, MAX_PHOTOS } from "../pet-schema";

// Unit tests for the shared publish validation schema (M5). Covers the required
// fields (category, species, >=1 photo), optional-field normalization (trimming,
// empty -> undefined), age coercion/bounds, enum rejection, and photo-path
// shape/limit validation.

const validMinimal = {
  category: "LOST",
  species: "DOG",
  photos: ["/uploads/a1b2c3.jpg"],
};

function fieldErrors(input: unknown) {
  const result = createPetSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) throw new Error("expected validation to fail");
  return result.error.flatten().fieldErrors;
}

describe("createPetSchema", () => {
  it("accepts the minimal required input", () => {
    const result = createPetSchema.safeParse(validMinimal);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.category).toBe("LOST");
    expect(result.data.species).toBe("DOG");
    expect(result.data.photos).toEqual(["/uploads/a1b2c3.jpg"]);
  });

  it("requires category and species", () => {
    const errors = fieldErrors({ photos: ["/uploads/a.jpg"] });
    expect(errors.category).toBeDefined();
    expect(errors.species).toBeDefined();
  });

  it("rejects unknown enum values", () => {
    expect(fieldErrors({ ...validMinimal, category: "SELLING" }).category).toBeDefined();
    expect(fieldErrors({ ...validMinimal, species: "FISH" }).species).toBeDefined();
    expect(fieldErrors({ ...validMinimal, size: "HUGE" }).size).toBeDefined();
    expect(fieldErrors({ ...validMinimal, gender: "OTHER" }).gender).toBeDefined();
  });

  it("requires at least one photo", () => {
    const errors = fieldErrors({ ...validMinimal, photos: [] });
    expect(errors.photos).toContain("请至少上传 1 张图片");
  });

  it("rejects more than the max number of photos", () => {
    const photos = Array.from(
      { length: MAX_PHOTOS + 1 },
      (_, i) => `/uploads/p${i}.jpg`,
    );
    expect(fieldErrors({ ...validMinimal, photos }).photos).toBeDefined();
  });

  it("rejects photo paths outside the uploads prefix", () => {
    expect(fieldErrors({ ...validMinimal, photos: ["/etc/passwd"] }).photos).toBeDefined();
    expect(
      fieldErrors({ ...validMinimal, photos: ["http://evil.example/x.jpg"] }).photos,
    ).toBeDefined();
    expect(fieldErrors({ ...validMinimal, photos: ["a.jpg"] }).photos).toBeDefined();
  });

  it("trims optional text and treats blank as omitted", () => {
    const result = createPetSchema.safeParse({
      ...validMinimal,
      name: "  旺财  ",
      breed: "   ",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("旺财");
    expect(result.data.breed).toBeUndefined();
  });

  it("coerces a valid age and rejects out-of-range / non-integer ages", () => {
    const ok = createPetSchema.safeParse({ ...validMinimal, age: "3" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.age).toBe(3);

    const blank = createPetSchema.safeParse({ ...validMinimal, age: "" });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.age).toBeUndefined();

    expect(fieldErrors({ ...validMinimal, age: "3.5" }).age).toBeDefined();
    expect(fieldErrors({ ...validMinimal, age: "-1" }).age).toBeDefined();
    expect(fieldErrors({ ...validMinimal, age: "200" }).age).toBeDefined();
  });

  it("accepts a fully populated, valid record", () => {
    const result = createPetSchema.safeParse({
      category: "ADOPTION",
      species: "CAT",
      size: "SMALL",
      gender: "FEMALE",
      name: "小花",
      breed: "中华田园猫",
      color: "橘白",
      age: 2,
      region: "上海",
      description: "亲人、已绝育",
      contactName: "张三",
      contactPhone: "13800000000",
      photos: ["/uploads/x.jpg", "/uploads/y.webp"],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.size).toBe("SMALL");
    expect(result.data.age).toBe(2);
    expect(result.data.photos).toHaveLength(2);
  });
});
