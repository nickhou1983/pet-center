// AI-generated unit tests for prisma/seed.ts utility functions
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Import types and constants from seed-data
import { SEED_PETS } from "../seed-data";

// Mock fs to avoid file system dependencies in unit tests
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

// Test the photoFilePath logic extracted from seed.ts
function photoFilePath(photoPath: string): string | null {
  const prefix = "/seed/";
  if (!photoPath.startsWith(prefix)) return null;
  const fileName = photoPath.slice(prefix.length);
  if (fileName.length === 0 || fileName.includes("/") || fileName.includes("..")) {
    return null;
  }
  return path.join(process.cwd(), "public", "seed", fileName);
}

describe("Seed script utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("photoFilePath", () => {
    it("converts valid seed photo path to file system path", () => {
      const result = photoFilePath("/seed/dog-golden-retriever.jpg");
      expect(result).toBe(path.join(process.cwd(), "public", "seed", "dog-golden-retriever.jpg"));
    });

    it("rejects path without /seed/ prefix", () => {
      const result = photoFilePath("/photos/dog.jpg");
      expect(result).toBeNull();
    });

    it("rejects empty filename after prefix", () => {
      const result = photoFilePath("/seed/");
      expect(result).toBeNull();
    });

    it("rejects path traversal attempts with ..", () => {
      const result = photoFilePath("/seed/../etc/passwd");
      expect(result).toBeNull();
    });

    it("rejects subdirectory paths", () => {
      const result = photoFilePath("/seed/subdir/dog.jpg");
      expect(result).toBeNull();
    });

    it("handles various image extensions", () => {
      const jpgResult = photoFilePath("/seed/cat.jpg");
      const pngResult = photoFilePath("/seed/dog.png");
      
      expect(jpgResult).toBe(path.join(process.cwd(), "public", "seed", "cat.jpg"));
      expect(pngResult).toBe(path.join(process.cwd(), "public", "seed", "dog.png"));
    });
  });

  describe("SEED_PETS data structure validation", () => {
    it("all seed pets have valid photo paths with /seed/ prefix", () => {
      for (const pet of SEED_PETS) {
        expect(pet.photos.length).toBeGreaterThan(0);
        expect(pet.photos[0]).toMatch(/^\/seed\//);
      }
    });

    it("all seed pet IDs start with seed- prefix", () => {
      for (const pet of SEED_PETS) {
        expect(pet.id).toMatch(/^seed-/);
      }
    });

    it("all seed pets have required fields", () => {
      for (const pet of SEED_PETS) {
        expect(pet.id).toBeTruthy();
        expect(pet.category).toBeTruthy();
        expect(pet.species).toBeTruthy();
        expect(pet.gender).toBeTruthy();
        expect(pet.description).toBeTruthy();
        expect(Array.isArray(pet.photos)).toBe(true);
      }
    });

    it("seed pet categories are valid enum values", () => {
      const validCategories = ["REGISTERED", "LOST", "FOUND", "ADOPTION"];
      for (const pet of SEED_PETS) {
        expect(validCategories).toContain(pet.category);
      }
    });

    it("seed pet species are valid enum values", () => {
      const validSpecies = ["DOG", "CAT", "OTHER"];
      for (const pet of SEED_PETS) {
        expect(validSpecies).toContain(pet.species);
      }
    });

    it("seed pet genders are valid enum values", () => {
      const validGenders = ["MALE", "FEMALE", "UNKNOWN"];
      for (const pet of SEED_PETS) {
        expect(validGenders).toContain(pet.gender);
      }
    });

    it("all seed pets have contact information", () => {
      for (const pet of SEED_PETS) {
        const hasContact = pet.contactName || pet.contactPhone;
        expect(hasContact).toBeTruthy();
      }
    });

    it("photo filenames do not contain path traversal sequences", () => {
      for (const pet of SEED_PETS) {
        for (const photo of pet.photos) {
          expect(photo).not.toContain("..");
          const fileName = photo.replace("/seed/", "");
          expect(fileName).not.toContain("/");
        }
      }
    });
  });

  describe("Seed data distribution", () => {
    it("includes all 4 pet categories", () => {
      const categories = new Set(SEED_PETS.map((p) => p.category));
      expect(categories.size).toBe(4);
      expect(categories.has("REGISTERED")).toBe(true);
      expect(categories.has("LOST")).toBe(true);
      expect(categories.has("FOUND")).toBe(true);
      expect(categories.has("ADOPTION")).toBe(true);
    });

    it("includes multiple species (DOG, CAT, OTHER)", () => {
      const species = new Set(SEED_PETS.map((p) => p.species));
      expect(species.size).toBeGreaterThanOrEqual(3);
      expect(species.has("DOG")).toBe(true);
      expect(species.has("CAT")).toBe(true);
    });

    it("includes pets of different genders", () => {
      const genders = new Set(SEED_PETS.map((p) => p.gender));
      expect(genders.size).toBeGreaterThan(1);
    });

    it("has exactly 16 seed pets as documented", () => {
      expect(SEED_PETS.length).toBe(16);
    });

    it("has the expected distribution per category", () => {
      const registered = SEED_PETS.filter((p) => p.category === "REGISTERED");
      const lost = SEED_PETS.filter((p) => p.category === "LOST");
      const found = SEED_PETS.filter((p) => p.category === "FOUND");
      const adoption = SEED_PETS.filter((p) => p.category === "ADOPTION");

      expect(registered.length).toBe(7);
      expect(lost.length).toBe(3);
      expect(found.length).toBe(3);
      expect(adoption.length).toBe(3);
    });
  });
});
