import { describe, expect, it } from "vitest";

import {
  l2Normalize,
  resolveSearchMode,
  resolveSearchWeights,
  toBoundedPositiveInt,
} from "../search";

describe("resolveSearchMode", () => {
  it("auto-picks hybrid when both inputs exist", () => {
    expect(resolveSearchMode({ hasImage: true, hasText: true })).toBe("hybrid");
  });

  it("auto-picks image/text with single input", () => {
    expect(resolveSearchMode({ hasImage: true, hasText: false })).toBe("image");
    expect(resolveSearchMode({ hasImage: false, hasText: true })).toBe("text");
  });

  it("rejects mismatched explicit mode", () => {
    expect(() =>
      resolveSearchMode({ mode: "hybrid", hasImage: true, hasText: false }),
    ).toThrow(/requires both image and description/);
  });
});

describe("resolveSearchWeights", () => {
  it("returns fixed weights in image/text mode", () => {
    expect(resolveSearchWeights("image", {})).toEqual({ image: 1, text: 0 });
    expect(resolveSearchWeights("text", {})).toEqual({ image: 0, text: 1 });
  });

  it("normalizes hybrid weights", () => {
    const result = resolveSearchWeights("hybrid", {
      imageWeight: "2",
      textWeight: "1",
    });
    expect(result.image).toBeCloseTo(2 / 3);
    expect(result.text).toBeCloseTo(1 / 3);
  });
});

describe("l2Normalize", () => {
  it("keeps direction and returns unit norm", () => {
    const normalized = l2Normalize([3, 4]);
    expect(normalized[0]).toBeCloseTo(0.6);
    expect(normalized[1]).toBeCloseTo(0.8);
  });
});

describe("toBoundedPositiveInt", () => {
  it("applies bounds and fallback", () => {
    expect(toBoundedPositiveInt("-1", 20, { min: 1, max: 100 })).toBe(1);
    expect(toBoundedPositiveInt("999", 20, { min: 1, max: 100 })).toBe(100);
    expect(toBoundedPositiveInt("abc", 20, { min: 1, max: 100 })).toBe(20);
  });
});
