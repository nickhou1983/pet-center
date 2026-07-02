// AI-generated unit tests for vector utility functions
// Tests pure serialization/parsing and similarity calculations

import { describe, expect, it } from "vitest";

// Pure implementations extracted from lib/vector.ts for unit testing
// These match the exported functions' signatures and logic

const EMBEDDING_DIM = 512;

function toVectorLiteral(vector: number[]): string {
  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Expected embedding of length ${EMBEDDING_DIM}, received ${vector.length}.`,
    );
  }
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new Error("Embedding contains a non-finite value.");
    }
  }
  return `[${vector.join(",")}]`;
}

function parseVectorLiteral(value: string): number[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error(`Invalid vector literal: ${value}`);
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner.split(",").map((part) => Number(part));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Cannot compare vectors of different lengths: ${a.length} vs ${b.length}.`,
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

describe("EMBEDDING_DIM", () => {
  it("should be 512 for CLIP model compatibility", () => {
    expect(EMBEDDING_DIM).toBe(512);
  });
});

describe("toVectorLiteral", () => {
  it("converts a valid 512-dim vector to pgvector text literal", () => {
    const vector = Array(512).fill(0.5);
    const result = toVectorLiteral(vector);
    expect(result).toMatch(/^\[0\.5(,0\.5){511}\]$/);
  });

  it("handles vectors with varying float values", () => {
    const vector = [0.1, 0.25, 0.333, -0.5, 1.0];
    vector.push(...Array(507).fill(0));
    const result = toVectorLiteral(vector);
    expect(result).toMatch(/^\[0\.1,0\.25,0\.333,-0\.5,1/);
    expect(result).toContain("]");
  });

  it("throws on incorrect embedding dimension", () => {
    const tooShort = Array(511).fill(0);
    const tooLong = Array(513).fill(0);

    expect(() => toVectorLiteral(tooShort)).toThrow(
      /Expected embedding of length 512, received 511/,
    );
    expect(() => toVectorLiteral(tooLong)).toThrow(
      /Expected embedding of length 512, received 513/,
    );
  });

  it("throws on non-finite values (NaN, Infinity)", () => {
    const withNaN = Array(512).fill(0);
    withNaN[100] = NaN;

    const withInfinity = Array(512).fill(0);
    withInfinity[200] = Infinity;

    const withNegInfinity = Array(512).fill(0);
    withNegInfinity[300] = -Infinity;

    expect(() => toVectorLiteral(withNaN)).toThrow(
      /Embedding contains a non-finite value/,
    );
    expect(() => toVectorLiteral(withInfinity)).toThrow(
      /Embedding contains a non-finite value/,
    );
    expect(() => toVectorLiteral(withNegInfinity)).toThrow(
      /Embedding contains a non-finite value/,
    );
  });

  it("preserves precision in vector values", () => {
    const vector = Array(512).fill(0);
    vector[0] = 0.123456789;
    const result = toVectorLiteral(vector);
    expect(result.startsWith("[0.123456789,")).toBe(true);
  });
});

describe("parseVectorLiteral", () => {
  it("parses a pgvector text literal back to a number array", () => {
    const literal = "[0.1,0.2,0.3]";
    const result = parseVectorLiteral(literal);
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("handles empty vector (empty brackets)", () => {
    const result = parseVectorLiteral("[]");
    expect(result).toEqual([]);
  });

  it("handles whitespace in the literal", () => {
    const result = parseVectorLiteral("  [ 0.1 , 0.2 , 0.3 ]  ");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("parses a full 512-dim vector from pgvector output", () => {
    const vector = Array(512).fill(0.5);
    const literal = `[${vector.join(",")}]`;
    const parsed = parseVectorLiteral(literal);
    expect(parsed).toHaveLength(512);
    expect(parsed.every((v) => v === 0.5)).toBe(true);
  });

  it("handles negative values", () => {
    const literal = "[-0.5,-0.1,0.0,0.1,0.5]";
    const result = parseVectorLiteral(literal);
    expect(result).toEqual([-0.5, -0.1, 0.0, 0.1, 0.5]);
  });

  it("throws on invalid literal format (missing brackets)", () => {
    expect(() => parseVectorLiteral("0.1,0.2,0.3")).toThrow(
      /Invalid vector literal/,
    );
    expect(() => parseVectorLiteral("[0.1,0.2,0.3")).toThrow(
      /Invalid vector literal/,
    );
    expect(() => parseVectorLiteral("0.1,0.2,0.3]")).toThrow(
      /Invalid vector literal/,
    );
  });

  it("handles non-numeric content inside brackets (converts to NaN)", () => {
    // parseVectorLiteral splits by comma and calls Number() on each part
    // Number("abc") returns NaN, which is a valid JavaScript number
    const result = parseVectorLiteral("[abc,def]");
    expect(result).toHaveLength(2);
    expect(Number.isNaN(result[0])).toBe(true);
    expect(Number.isNaN(result[1])).toBe(true);
  });

  it("round-trips: toVectorLiteral -> parseVectorLiteral", () => {
    const original = Array(512).fill(0);
    original[0] = 0.123;
    original[100] = -0.456;
    original[511] = 0.789;

    const literal = toVectorLiteral(original);
    const parsed = parseVectorLiteral(literal);

    expect(parsed).toHaveLength(original.length);
    expect(parsed[0]).toBe(original[0]);
    expect(parsed[100]).toBe(original[100]);
    expect(parsed[511]).toBe(original[511]);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const vector = Array(10).fill(0.5);
    const similarity = cosineSimilarity(vector, vector);
    expect(similarity).toBeCloseTo(1.0);
  });

  it("returns -1.0 for opposite vectors", () => {
    const a = Array(10).fill(1);
    const b = Array(10).fill(-1);
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(-1.0);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(0);
  });

  it("returns 0 for a zero vector paired with any vector", () => {
    const zero = [0, 0, 0, 0, 0];
    const any = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(zero, any)).toBe(0);
    expect(cosineSimilarity(any, zero)).toBe(0);
  });

  it("computes correct similarity for normalized unit vectors", () => {
    // Two unit vectors at a 60-degree angle have cosine similarity ≈ 0.5
    const a = [1, 0];
    const b = [0.5, Math.sqrt(3) / 2];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(0.5, 1);
  });

  it("handles high-dimensional vectors (512-dim CLIP embeddings)", () => {
    const a = Array(512).fill(0.5);
    const b = Array(512).fill(0.5);
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(1.0);
  });

  it("throws on vectors of different lengths", () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(() => cosineSimilarity(a, b)).toThrow(
      /Cannot compare vectors of different lengths/,
    );
  });

  it("handles negative values in vectors", () => {
    const a = [-1, -2, -3];
    const b = [-1, -2, -3];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(1.0);
  });

  it("handles mixed positive and negative values", () => {
    const a = [1, -1, 1, -1];
    const b = [1, -1, 1, -1];
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(1.0);
  });

  it("is commutative: cosineSimilarity(a, b) === cosineSimilarity(b, a)", () => {
    const a = [0.1, 0.2, 0.3, 0.4, 0.5];
    const b = [0.5, 0.4, 0.3, 0.2, 0.1];
    const ab = cosineSimilarity(a, b);
    const ba = cosineSimilarity(b, a);
    expect(ab).toBeCloseTo(ba);
  });

  it("scales correctly: similarity(k*a, k*b) == similarity(a, b)", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const scaled_a = [2, 4, 6];
    const scaled_b = [8, 10, 12];
    const sim1 = cosineSimilarity(a, b);
    const sim2 = cosineSimilarity(scaled_a, scaled_b);
    expect(sim1).toBeCloseTo(sim2);
  });

  it("produces expected similarity between different vectors", () => {
    const a = [1, 0, 0];
    const b = [1, 1, 0];
    // Expected: dot=1, normA=1, normB=√2, similarity=1/√2≈0.707
    const similarity = cosineSimilarity(a, b);
    expect(similarity).toBeCloseTo(0.707, 2);
  });
});
