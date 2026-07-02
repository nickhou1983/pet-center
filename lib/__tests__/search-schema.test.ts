// This file is AI-generated for testing the shared hybrid-search schema and helpers (M6).
// Covers the real exported logic in lib/search-schema.ts: the request validation
// contract (at-least-one-input rule, defaults, coercion, filter normalization),
// the weight-resolution logic (mode selection + normalization), and score
// clamping/rounding. No reimplemented helpers or tautological assertions.

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  clampScore,
  resolveWeights,
  roundScore,
  searchRequestSchema,
} from "../search-schema";

describe("searchRequestSchema — at least one query input", () => {
  it("rejects a request with neither photo nor description", () => {
    expect(searchRequestSchema.safeParse({}).success).toBe(false);
    expect(
      searchRequestSchema.safeParse({ category: "REGISTERED" }).success,
    ).toBe(false);
  });

  it("treats a whitespace-only description as absent (still requires a photo)", () => {
    expect(searchRequestSchema.safeParse({ description: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a photo-only request", () => {
    expect(
      searchRequestSchema.safeParse({ photo: "/uploads/query.jpg" }).success,
    ).toBe(true);
  });

  it("accepts a description-only request", () => {
    expect(
      searchRequestSchema.safeParse({ description: "橘白色的小猫" }).success,
    ).toBe(true);
  });
});

describe("searchRequestSchema — defaults and coercion", () => {
  it("defaults weights, page, and pageSize when omitted", () => {
    const result = searchRequestSchema.safeParse({
      description: "a dog",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.wImage).toBe(0.5);
    expect(result.data.wText).toBe(0.5);
    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("coerces string weights and pagination from form/query input", () => {
    const result = searchRequestSchema.safeParse({
      description: "a dog",
      wImage: "0.7",
      wText: "0.3",
      page: "2",
      pageSize: "10",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.wImage).toBe(0.7);
    expect(result.data.wText).toBe(0.3);
    expect(result.data.page).toBe(2);
    expect(result.data.pageSize).toBe(10);
  });

  it("rejects weights outside [0, 1] and pageSize above the cap", () => {
    expect(
      searchRequestSchema.safeParse({ description: "x", wImage: 1.5 }).success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({ description: "x", wText: -0.1 }).success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({
        description: "x",
        pageSize: MAX_PAGE_SIZE + 1,
      }).success,
    ).toBe(false);
  });
});

describe("searchRequestSchema — filters and photo path", () => {
  it("normalizes empty-string filters to undefined", () => {
    const result = searchRequestSchema.safeParse({
      description: "a dog",
      category: "",
      species: "",
      breed: "",
      region: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.category).toBeUndefined();
    expect(result.data.species).toBeUndefined();
    expect(result.data.breed).toBeUndefined();
    expect(result.data.region).toBeUndefined();
  });

  it("keeps valid enum + text filters", () => {
    const result = searchRequestSchema.safeParse({
      description: "a dog",
      category: "REGISTERED",
      species: "CAT",
      size: "SMALL",
      gender: "FEMALE",
      breed: "金毛",
      region: "上海",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.category).toBe("REGISTERED");
    expect(result.data.species).toBe("CAT");
    expect(result.data.size).toBe("SMALL");
    expect(result.data.gender).toBe("FEMALE");
    expect(result.data.breed).toBe("金毛");
    expect(result.data.region).toBe("上海");
  });

  it("rejects unknown enum values", () => {
    expect(
      searchRequestSchema.safeParse({ description: "x", species: "FISH" })
        .success,
    ).toBe(false);
  });

  it("rejects a photo that is not a public uploads path", () => {
    expect(
      searchRequestSchema.safeParse({ photo: "http://evil.com/a.jpg" }).success,
    ).toBe(false);
    expect(
      searchRequestSchema.safeParse({ photo: "/uploads/../secret.txt" }).success,
    ).toBe(false);
  });
});

describe("resolveWeights", () => {
  it("uses pure image ranking when only a photo is present", () => {
    expect(resolveWeights({ hasImage: true, hasText: false })).toEqual({
      image: 1,
      text: 0,
      mode: "image",
    });
  });

  it("uses pure text ranking when only a description is present", () => {
    expect(resolveWeights({ hasImage: false, hasText: true })).toEqual({
      image: 0,
      text: 1,
      mode: "text",
    });
  });

  it("normalizes provided weights to sum to 1 for fusion", () => {
    const resolved = resolveWeights({
      hasImage: true,
      hasText: true,
      wImage: 3,
      wText: 1,
    });
    expect(resolved.mode).toBe("fusion");
    expect(resolved.image).toBeCloseTo(0.75);
    expect(resolved.text).toBeCloseTo(0.25);
    expect(resolved.image + resolved.text).toBeCloseTo(1);
  });

  it("defaults to an even fusion split when weights are omitted", () => {
    const resolved = resolveWeights({ hasImage: true, hasText: true });
    expect(resolved).toEqual({ image: 0.5, text: 0.5, mode: "fusion" });
  });

  it("falls back to an even split when both weights are zero", () => {
    const resolved = resolveWeights({
      hasImage: true,
      hasText: true,
      wImage: 0,
      wText: 0,
    });
    expect(resolved).toEqual({ image: 0.5, text: 0.5, mode: "fusion" });
  });
});

describe("clampScore / roundScore", () => {
  it("clamps values into [0, 1]", () => {
    expect(clampScore(-0.3)).toBe(0);
    expect(clampScore(1.2)).toBe(1);
    expect(clampScore(0.42)).toBe(0.42);
  });

  it("treats non-finite values as 0", () => {
    expect(clampScore(NaN)).toBe(0);
    expect(clampScore(Infinity)).toBe(0); // non-finite guard returns 0
  });

  it("rounds to four decimals after clamping", () => {
    expect(roundScore(0.123456)).toBe(0.1235);
    expect(roundScore(0.99999)).toBe(1);
    expect(roundScore(-5)).toBe(0);
  });
});
