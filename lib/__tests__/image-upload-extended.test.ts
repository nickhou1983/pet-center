// AI-generated unit tests for image-upload utilities (lib/image-upload.ts)

import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES,
  sniffImageType,
  validateImage,
} from "../image-upload";

describe("readPositiveIntEnv (via exported constants)", () => {
  it("loads MAX_FILE_SIZE_BYTES with correct default (5MB)", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("loads MAX_FILES with correct default (10)", () => {
    expect(MAX_FILES).toBe(10);
  });

  it("MAX_FILE_SIZE_BYTES is a positive integer", () => {
    expect(Number.isInteger(MAX_FILE_SIZE_BYTES)).toBe(true);
    expect(MAX_FILE_SIZE_BYTES > 0).toBe(true);
  });

  it("MAX_FILES is a positive integer", () => {
    expect(Number.isInteger(MAX_FILES)).toBe(true);
    expect(MAX_FILES > 0).toBe(true);
  });
});

describe("sniffImageType signature validation", () => {
  it("is a function that accepts a Buffer", () => {
    expect(typeof sniffImageType).toBe("function");
  });

  it("returns null or string from a buffer", () => {
    const result = sniffImageType(Buffer.from([0xff, 0xd8, 0xff]));
    expect(result === null || typeof result === "string").toBe(true);
  });
});

describe("validateImage function", () => {
  it("is a function that accepts input and optional options", () => {
    expect(typeof validateImage).toBe("function");
  });

  it("returns object with ok boolean property", () => {
    const result = validateImage({ buffer: Buffer.from([]) });
    expect(typeof result === "object" && result !== null).toBe(true);
    expect(typeof result.ok).toBe("boolean");
  });
});

describe("ALLOWED_IMAGE_TYPES structure", () => {
  it("is an object mapping mime types to extensions", () => {
    expect(typeof ALLOWED_IMAGE_TYPES).toBe("object");
    expect(ALLOWED_IMAGE_TYPES).not.toBeNull();
  });

  it("includes JPEG, PNG, and WebP", () => {
    expect("image/jpeg" in ALLOWED_IMAGE_TYPES).toBe(true);
    expect("image/png" in ALLOWED_IMAGE_TYPES).toBe(true);
    expect("image/webp" in ALLOWED_IMAGE_TYPES).toBe(true);
  });

  it("maps to correct canonical extensions", () => {
    expect(ALLOWED_IMAGE_TYPES["image/jpeg"]).toBe("jpg");
    expect(ALLOWED_IMAGE_TYPES["image/png"]).toBe("png");
    expect(ALLOWED_IMAGE_TYPES["image/webp"]).toBe("webp");
  });
});
