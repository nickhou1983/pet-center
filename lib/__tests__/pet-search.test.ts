// This file is AI-generated for testing the hybrid-search query builder (M6).
// Focuses on the injection-safety contract of buildFilterConditions: every
// attribute filter must be emitted as a *parameterized* Prisma.Sql fragment
// (value in `.values`, never concatenated into the SQL text), enums get an
// explicit type cast, and free-text filters are wrapped as escaped ILIKE
// patterns. Also asserts hybridSearch rejects a query with no vector at all.
//
// The Prisma client is mocked so importing the module never constructs a real
// PrismaClient or touches a database — buildFilterConditions is pure and only
// uses Prisma.sql (a tagged template), which needs no connection.

import { describe, expect, it, vi } from "vitest";

vi.mock("../prisma", () => ({ prisma: {}, default: {} }));

import { buildFilterConditions, hybridSearch } from "../pet-search";

/** Minimal view of a Prisma.Sql fragment's public parts. */
type SqlFragment = { strings: readonly string[]; values: readonly unknown[] };

const asFragment = (value: unknown) => value as unknown as SqlFragment;

describe("buildFilterConditions", () => {
  it("returns no conditions when no filters are provided", () => {
    expect(buildFilterConditions({})).toHaveLength(0);
  });

  it("parameterizes enum filters with an explicit type cast", () => {
    const conditions = buildFilterConditions({ category: "REGISTERED" });
    expect(conditions).toHaveLength(1);

    const fragment = asFragment(conditions[0]);
    // The value is a bound parameter, not inlined into the SQL text.
    expect(fragment.values).toEqual(["REGISTERED"]);
    const text = fragment.strings.join("");
    expect(text).not.toContain("REGISTERED");
    expect(text).toContain('"category"');
    expect(text).toContain('::"PetCategory"');
    expect(fragment.strings[0].startsWith("AND ")).toBe(true);
  });

  it("wraps free-text filters as parameterized ILIKE patterns", () => {
    const conditions = buildFilterConditions({ breed: "golden" });
    expect(conditions).toHaveLength(1);

    const fragment = asFragment(conditions[0]);
    expect(fragment.values).toEqual(["%golden%"]);
    const text = fragment.strings.join("");
    expect(text).toContain("ILIKE");
    expect(text).not.toContain("golden");
  });

  it("escapes LIKE wildcards in free-text filters so they match literally", () => {
    const conditions = buildFilterConditions({ color: "50%_a" });
    const fragment = asFragment(conditions[0]);
    // % and _ are escaped with a backslash, then wrapped in %...%.
    expect(fragment.values).toEqual(["%50\\%\\_a%"]);
  });

  it("emits one AND-prefixed condition per provided filter, in order", () => {
    const conditions = buildFilterConditions({
      species: "CAT",
      size: "SMALL",
      gender: "FEMALE",
      region: "上海",
    });
    expect(conditions).toHaveLength(4);
    for (const condition of conditions) {
      expect(asFragment(condition).strings[0].startsWith("AND ")).toBe(true);
    }
    // Values are carried as parameters in filter order.
    expect(conditions.map((c) => asFragment(c).values[0])).toEqual([
      "CAT",
      "SMALL",
      "FEMALE",
      "%上海%",
    ]);
  });
});

describe("hybridSearch", () => {
  it("rejects a query with neither an image nor a text vector", async () => {
    await expect(
      hybridSearch({
        imageVector: null,
        textVector: null,
        wImage: 0,
        wText: 0,
        filters: {},
        limit: 10,
        offset: 0,
      }),
    ).rejects.toThrow(/at least one query vector/);
  });
});
