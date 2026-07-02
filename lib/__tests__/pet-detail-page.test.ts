// This file is AI-generated for testing the pet detail page helpers (M5).
// It imports the real helpers from lib/pet-detail.ts (used by
// app/pets/[id]/page.tsx) so the assertions guard the actual product code
// rather than an inline copy of it.

import { describe, expect, it } from "vitest";

import { buildDetailTitle, formatAge, isPresent } from "../pet-detail";

describe("pet-detail helpers", () => {
  describe("isPresent", () => {
    it("returns true for non-empty strings and any number, including 0", () => {
      expect(isPresent("hello")).toBe(true);
      expect(isPresent("0")).toBe(true);
      expect(isPresent(" ")).toBe(true);
      expect(isPresent(123)).toBe(true);
      expect(isPresent(-1)).toBe(true);
      expect(isPresent(0)).toBe(true);
    });

    it("returns false for empty string, null and undefined", () => {
      expect(isPresent("")).toBe(false);
      expect(isPresent(null)).toBe(false);
      expect(isPresent(undefined)).toBe(false);
    });

    it("filters an attribute list the same way the detail page does", () => {
      const attributes = [
        ["物种", "狗"],
        ["品种", "泰迪"],
        ["颜色", null],
        ["体型", undefined],
        ["性别", "雄性"],
        ["年龄", 0], // age 0 is a real value and must survive the filter
        ["地区", ""],
        ["名字", "旺财"],
      ] as Array<[string, string | number | null | undefined]>;

      expect(attributes.filter(([, value]) => isPresent(value))).toEqual([
        ["物种", "狗"],
        ["品种", "泰迪"],
        ["性别", "雄性"],
        ["年龄", 0],
        ["名字", "旺财"],
      ]);
    });
  });

  describe("formatAge", () => {
    it("appends the 岁 suffix for concrete ages, including 0", () => {
      expect(formatAge(3)).toBe("3 岁");
      expect(formatAge(0)).toBe("0 岁");
    });

    it("returns null when the age is absent so the row can be omitted", () => {
      expect(formatAge(null)).toBeNull();
      expect(formatAge(undefined)).toBeNull();
    });
  });

  describe("buildDetailTitle", () => {
    it("prefers the pet name when it is set", () => {
      expect(buildDetailTitle("旺财", "备案", "狗")).toBe("旺财");
    });

    it("falls back to category · species when the name is null/undefined", () => {
      expect(buildDetailTitle(null, "备案", "狗")).toBe("备案 · 狗");
      expect(buildDetailTitle(undefined, "备案", "狗")).toBe("备案 · 狗");
    });

    it("skips empty labels when joining the fallback title", () => {
      expect(buildDetailTitle(null, "备案", "")).toBe("备案");
      expect(buildDetailTitle(null, "", "")).toBe("");
      expect(buildDetailTitle(null, undefined, "狗")).toBe("狗");
    });

    it("keeps an explicit empty-string name as an empty title (?? only falls back on nullish)", () => {
      expect(buildDetailTitle("", "备案", "狗")).toBe("");
    });
  });
});
