import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SEED_PETS } from "../../prisma/seed-data";

describe("SEED_PETS", () => {
  it("contains 16 deterministic seed pets", () => {
    expect(SEED_PETS).toHaveLength(16);

    const ids = SEED_PETS.map((pet) => pet.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("seed-"))).toBe(true);
  });

  it("covers expected categories and species", () => {
    const categories = new Set(SEED_PETS.map((pet) => pet.category));
    expect(categories).toEqual(
      new Set(["REGISTERED", "LOST", "FOUND", "ADOPTION"]),
    );
    expect(
      SEED_PETS.filter((pet) => pet.category === "REGISTERED").length,
    ).toBeGreaterThanOrEqual(6);

    const species = new Set(SEED_PETS.map((pet) => pet.species));
    expect(species).toEqual(new Set(["DOG", "CAT", "OTHER"]));
  });

  it("references existing public seed photos", () => {
    for (const pet of SEED_PETS) {
      expect(pet.photos.length).toBeGreaterThan(0);

      for (const photo of pet.photos) {
        expect(photo.startsWith("/seed/")).toBe(true);
        const filePath = path.join(process.cwd(), "public", photo);
        expect(existsSync(filePath), `${pet.id} photo missing: ${photo}`).toBe(
          true,
        );
      }
    }
  });

  it("has useful Chinese descriptions and contact information", () => {
    for (const pet of SEED_PETS) {
      expect(pet.description.trim().length).toBeGreaterThanOrEqual(10);

      if (pet.category !== "FOUND") {
        expect(Boolean(pet.contactName || pet.contactPhone)).toBe(true);
      } else {
        expect(pet.contactName).toBe("宠缘小站志愿者");
        expect(pet.contactPhone).toMatch(/^138-0000-00\d{2}$/);
      }
    }
  });
});
