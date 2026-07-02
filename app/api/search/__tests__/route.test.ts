// This file is AI-generated for testing the POST /api/search route (M6).
// Covers validation error handling (invalid requests, missing query inputs),
// photo resolution errors, and the overall response structure. The CLIP model
// inference and database queries are mocked to keep tests fast and deterministic.
// The full integration (vectors → database → results) is validated by the
// end-to-end behavior of searchRequestSchema and hybridSearch tested elsewhere.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all the dependencies before importing the route handler.
vi.mock("node:fs/promises", () => {
  const readFile = vi.fn();
  // Provide both the named export (the route uses `import { readFile }`) and a
  // `default` so vitest's ESM interop for the node builtin resolves cleanly.
  return { readFile, default: { readFile } };
});

vi.mock("@/lib/clip", () => ({
  getImageEmbedding: vi.fn(),
  getTextEmbedding: vi.fn(),
}));

vi.mock("@/lib/pet-search", () => ({
  hybridSearch: vi.fn(),
  countMatches: vi.fn(),
}));

vi.mock("@/lib/pet-photos", () => ({
  resolvePhotoFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { getImageEmbedding, getTextEmbedding } from "@/lib/clip";
import { hybridSearch, countMatches } from "@/lib/pet-search";
import { resolvePhotoFile } from "@/lib/pet-photos";
import { POST } from "../route";

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request body that is not JSON", async () => {
    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "text/plain" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("INVALID_REQUEST");
  });

  it("returns VALIDATION_ERROR when neither photo nor description is provided", async () => {
    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        page: 1,
        pageSize: 20,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.fieldErrors).toBeDefined();
  });

  it("returns VALIDATION_ERROR when weights are out of range", async () => {
    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "test",
        wImage: 1.5, // Out of [0, 1]
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns VALIDATION_ERROR when pageSize exceeds the cap", async () => {
    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "test",
        pageSize: 51, // MAX_PAGE_SIZE is 50
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns INVALID_PHOTO when resolvePhotoFile rejects the path (returns null)", async () => {
    // A schema-valid /uploads path that the filesystem resolver refuses (e.g. a
    // traversal it neutralizes) surfaces as INVALID_PHOTO. The path must pass the
    // zod schema first, so it cannot literally contain "..".
    vi.mocked(resolvePhotoFile).mockReturnValue(null);

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        photo: "/uploads/secret.txt",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("INVALID_PHOTO");
  });

  it("returns PHOTO_NOT_FOUND when the file cannot be read", async () => {
    vi.mocked(resolvePhotoFile).mockReturnValue("/tmp/uploads/photo.jpg");
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        photo: "/uploads/photo.jpg",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.code).toBe("PHOTO_NOT_FOUND");
  });

  it("returns EMBEDDING_FAILED when image embedding generation fails", async () => {
    vi.mocked(resolvePhotoFile).mockReturnValue("/tmp/uploads/photo.jpg");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake image data"));
    vi.mocked(getImageEmbedding).mockRejectedValue(new Error("CLIP error"));

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        photo: "/uploads/photo.jpg",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.code).toBe("EMBEDDING_FAILED");
  });

  it("returns EMBEDDING_FAILED when text embedding generation fails", async () => {
    vi.mocked(getTextEmbedding).mockRejectedValue(new Error("CLIP error"));

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "a cat",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.code).toBe("EMBEDDING_FAILED");
  });

  it("returns DB_ERROR when the search query fails", async () => {
    const mockVector = new Array(512).fill(0.1);
    vi.mocked(getTextEmbedding).mockResolvedValue(mockVector);
    vi.mocked(hybridSearch).mockRejectedValue(new Error("Database connection error"));

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "a cat",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.code).toBe("DB_ERROR");
  });

  it("returns a successful response with text-only search results", async () => {
    const mockVector = new Array(512).fill(0.1);
    const mockResults = [
      {
        id: "pet-1",
        category: "REGISTERED",
        species: "CAT",
        size: null,
        gender: "UNKNOWN",
        name: "Fluffy",
        breed: null,
        color: null,
        region: null,
        photos: ["/uploads/fluffy.jpg"],
        score: 0.85,
        imageScore: null,
        textScore: 0.85,
      },
    ];

    vi.mocked(getTextEmbedding).mockResolvedValue(mockVector);
    vi.mocked(hybridSearch).mockResolvedValue(mockResults);
    vi.mocked(countMatches).mockResolvedValue(42);

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "orange tabby cat",
        page: 1,
        pageSize: 20,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.mode).toBe("text");
    expect(data.weights).toEqual({ image: 0, text: 1 });
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(20);
    expect(data.total).toBe(42);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe("pet-1");
    expect(data.results[0].score).toBe(0.85);
  });

  it("returns a successful response with fusion search results", async () => {
    const mockImageVector = new Array(512).fill(0.15);
    const mockTextVector = new Array(512).fill(0.1);
    const mockResults = [
      {
        id: "pet-1",
        category: "REGISTERED",
        species: "DOG",
        size: "LARGE",
        gender: "MALE",
        name: "Rex",
        breed: "Labrador",
        color: "Yellow",
        region: "New York",
        photos: ["/uploads/rex.jpg"],
        score: 0.88,
        imageScore: 0.92,
        textScore: 0.84,
      },
    ];

    vi.mocked(resolvePhotoFile).mockReturnValue("/tmp/uploads/query.jpg");
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake image"));
    vi.mocked(getImageEmbedding).mockResolvedValue(mockImageVector);
    vi.mocked(getTextEmbedding).mockResolvedValue(mockTextVector);
    vi.mocked(hybridSearch).mockResolvedValue(mockResults);
    vi.mocked(countMatches).mockResolvedValue(1);

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        photo: "/uploads/query.jpg",
        description: "golden retriever",
        wImage: 0.6,
        wText: 0.4,
        page: 1,
        pageSize: 10,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.mode).toBe("fusion");
    expect(data.weights.image).toBeCloseTo(0.6);
    expect(data.weights.text).toBeCloseTo(0.4);
    expect(data.results[0].imageScore).toBe(0.92);
    expect(data.results[0].textScore).toBe(0.84);
  });

  it("passes filters to hybridSearch correctly", async () => {
    const mockVector = new Array(512).fill(0.1);
    vi.mocked(getTextEmbedding).mockResolvedValue(mockVector);
    vi.mocked(hybridSearch).mockResolvedValue([]);
    vi.mocked(countMatches).mockResolvedValue(0);

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "cat",
        category: "REGISTERED",
        species: "CAT",
        size: "SMALL",
        gender: "FEMALE",
        breed: "Persian",
        color: "White",
        region: "Shanghai",
        page: 2,
        pageSize: 25,
      }),
    });

    await POST(request);

    expect(hybridSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          category: "REGISTERED",
          species: "CAT",
          size: "SMALL",
          gender: "FEMALE",
          breed: "Persian",
          color: "White",
          region: "Shanghai",
        },
        limit: 25,
        offset: 25, // (page 2 - 1) * 25
      }),
    );
  });

  it("rounds scores to 4 decimals in the response", async () => {
    const mockVector = new Array(512).fill(0.1);
    const mockResults = [
      {
        id: "pet-1",
        category: "REGISTERED",
        species: "CAT",
        size: null,
        gender: "UNKNOWN",
        name: "Cat",
        breed: null,
        color: null,
        region: null,
        photos: [],
        score: 0.123456789,
        imageScore: 0.987654321,
        textScore: 0.555555555,
      },
    ];

    vi.mocked(getTextEmbedding).mockResolvedValue(mockVector);
    vi.mocked(hybridSearch).mockResolvedValue(mockResults);
    vi.mocked(countMatches).mockResolvedValue(1);

    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({
        description: "test",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.results[0].score).toBe(0.1235); // Rounded to 4 decimals
    expect(data.results[0].imageScore).toBe(0.9877);
    expect(data.results[0].textScore).toBe(0.5556);
  });
});
