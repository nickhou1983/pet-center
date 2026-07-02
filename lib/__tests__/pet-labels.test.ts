// This file is AI-generated for testing pet-labels.ts (M5).
// Tests cover the label records for pet categories, species, sizes, genders, and statuses.

import { describe, expect, it } from "vitest";

import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
} from "../pet-labels";

describe("pet-labels", () => {
  describe("CATEGORY_LABELS", () => {
    it("provides labels for all pet categories", () => {
      expect(CATEGORY_LABELS.REGISTERED).toBe("备案");
      expect(CATEGORY_LABELS.LOST).toBe("走失");
      expect(CATEGORY_LABELS.FOUND).toBe("捡到");
      expect(CATEGORY_LABELS.ADOPTION).toBe("领养");
    });

    it("has 4 category labels", () => {
      expect(Object.keys(CATEGORY_LABELS)).toHaveLength(4);
    });
  });

  describe("SPECIES_LABELS", () => {
    it("provides labels for all species", () => {
      expect(SPECIES_LABELS.DOG).toBe("狗");
      expect(SPECIES_LABELS.CAT).toBe("猫");
      expect(SPECIES_LABELS.OTHER).toBe("其他");
    });

    it("has 3 species labels", () => {
      expect(Object.keys(SPECIES_LABELS)).toHaveLength(3);
    });
  });

  describe("SIZE_LABELS", () => {
    it("provides labels for all pet sizes", () => {
      expect(SIZE_LABELS.SMALL).toBe("小型");
      expect(SIZE_LABELS.MEDIUM).toBe("中型");
      expect(SIZE_LABELS.LARGE).toBe("大型");
    });

    it("has 3 size labels", () => {
      expect(Object.keys(SIZE_LABELS)).toHaveLength(3);
    });
  });

  describe("GENDER_LABELS", () => {
    it("provides labels for all genders", () => {
      expect(GENDER_LABELS.MALE).toBe("雄性");
      expect(GENDER_LABELS.FEMALE).toBe("雌性");
      expect(GENDER_LABELS.UNKNOWN).toBe("未知");
    });

    it("has 3 gender labels", () => {
      expect(Object.keys(GENDER_LABELS)).toHaveLength(3);
    });
  });

  describe("STATUS_LABELS", () => {
    it("provides labels for all statuses", () => {
      expect(STATUS_LABELS.ACTIVE).toBe("进行中");
      expect(STATUS_LABELS.RESOLVED).toBe("已解决");
      expect(STATUS_LABELS.ARCHIVED).toBe("已归档");
    });

    it("has 3 status labels", () => {
      expect(Object.keys(STATUS_LABELS)).toHaveLength(3);
    });
  });

  describe("label consistency", () => {
    it("all labels are non-empty strings", () => {
      const allLabels = [
        ...Object.values(CATEGORY_LABELS),
        ...Object.values(SPECIES_LABELS),
        ...Object.values(SIZE_LABELS),
        ...Object.values(GENDER_LABELS),
        ...Object.values(STATUS_LABELS),
      ];
      allLabels.forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });
});
