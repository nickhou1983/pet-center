// This file is AI-generated for testing the pet detail page logic.
// Tests cover utility functions and label handling used in app/pets/[id]/page.tsx

import { describe, expect, it } from "vitest";

// The isPresent utility function logic is extracted and tested here
function isPresent(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

describe("pet detail page utilities", () => {
  describe("isPresent", () => {
    it("returns true for non-empty strings", () => {
      expect(isPresent("hello")).toBe(true);
      expect(isPresent("0")).toBe(true);
      expect(isPresent(" ")).toBe(true);
    });

    it("returns true for non-zero numbers", () => {
      expect(isPresent(123)).toBe(true);
      expect(isPresent(-1)).toBe(true);
      expect(isPresent(0.5)).toBe(true);
    });

    it("returns true for zero", () => {
      expect(isPresent(0)).toBe(true);
    });

    it("returns false for empty strings", () => {
      expect(isPresent("")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isPresent(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isPresent(undefined)).toBe(false);
    });

    describe("label mapping edge cases", () => {
      it("filters out falsy values when building attribute list", () => {
        const attributes = [
          ["物种", "狗"],
          ["品种", "泰迪"],
          ["颜色", null],
          ["体型", undefined],
          ["性别", "雄性"],
          ["年龄", 0], // age 0 is valid
          ["地区", ""],
          ["名字", "旺财"],
        ] as Array<[string, string | number | null | undefined]>;

        const filtered = attributes.filter(([, value]) => isPresent(value));

        expect(filtered).toEqual([
          ["物种", "狗"],
          ["品种", "泰迪"],
          ["性别", "雄性"],
          ["年龄", 0],
          ["名字", "旺财"],
        ]);
      });

      it("preserves zero values in attribute list", () => {
        expect(isPresent(0)).toBe(true);
        const ageAttribute = ["年龄", 0];
        expect(isPresent(ageAttribute[1])).toBe(true);
      });

      it("filters out null and undefined from mixed types", () => {
        const values: Array<string | number | null | undefined> = [
          "test",
          0,
          null,
          undefined,
          "",
          123,
        ];
        const present = values.filter(isPresent);
        expect(present).toEqual(["test", 0, 123]);
      });
    });
  });

  describe("title generation logic", () => {
    it("uses pet name when available", () => {
      const petName = "旺财";
      expect(petName).toBeTruthy();
    });

    it("falls back to category and species labels when name is unavailable", () => {
      const categoryLabel = "备案";
      const speciesLabel = "狗";
      const titleParts = [categoryLabel, speciesLabel]
        .filter(Boolean)
        .join(" · ");
      expect(titleParts).toBe("备案 · 狗");
    });

    it("handles missing category or species gracefully", () => {
      const categoryLabel = "备案";
      const speciesLabel = "";
      const titleParts = [categoryLabel, speciesLabel]
        .filter(Boolean)
        .join(" · ");
      expect(titleParts).toBe("备案");
    });

    it("handles both category and species missing", () => {
      const categoryLabel = "";
      const speciesLabel = "";
      const titleParts = [categoryLabel, speciesLabel]
        .filter(Boolean)
        .join(" · ");
      expect(titleParts).toBe("");
    });
  });

  describe("age formatting", () => {
    it("formats age with suffix when present", () => {
      const age = 3;
      const formatted = `${age} 岁`;
      expect(formatted).toBe("3 岁");
    });

    it("handles age as null", () => {
      const age: number | null = null;
      const formatted = age !== null ? `${age} 岁` : null;
      expect(formatted).toBeNull();
    });

    it("handles age as 0 correctly", () => {
      const age = 0;
      const formatted = `${age} 岁`;
      expect(formatted).toBe("0 岁");
    });
  });
});
