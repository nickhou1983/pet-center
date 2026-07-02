// This file is AI-generated for testing image-upload.ts (M5).
// Unit tests for image validation: format sniffing (JPEG, PNG, WebP, GIF),
// size checks, and type allowlisting.

import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  sniffImageType,
  validateImage,
} from "../image-upload";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function webp(): Buffer {
  const buffer = Buffer.alloc(16);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  return buffer;
}

describe("sniffImageType", () => {
  it("detects jpeg, png and webp by magic bytes", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(webp())).toBe("image/webp");
  });

  it("returns null for unsupported signatures", () => {
    expect(sniffImageType(Buffer.from("hello world"))).toBeNull();
    // GIF magic bytes are intentionally not in the allow-list.
    expect(sniffImageType(Buffer.from([0x47, 0x49, 0x46, 0x38]))).toBeNull();
  });

  it("returns null for buffers too short to match", () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe("validateImage", () => {
  it("accepts a valid jpeg and returns canonical type + extension", () => {
    expect(validateImage({ buffer: JPEG })).toEqual({
      ok: true,
      type: "image/jpeg",
      extension: "jpg",
    });
  });

  it("accepts a valid png and webp", () => {
    expect(validateImage({ buffer: PNG })).toMatchObject({
      ok: true,
      type: "image/png",
      extension: "png",
    });
    expect(validateImage({ buffer: webp() })).toMatchObject({
      ok: true,
      type: "image/webp",
      extension: "webp",
    });
  });

  it("rejects an empty file", () => {
    expect(validateImage({ buffer: Buffer.alloc(0) })).toMatchObject({
      ok: false,
      code: "EMPTY_FILE",
    });
  });

  it("rejects a file over the size limit", () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(100)]);
    expect(validateImage({ buffer: big }, { maxSizeBytes: 10 })).toMatchObject({
      ok: false,
      code: "FILE_TOO_LARGE",
    });
  });

  it("rejects unsupported content by signature", () => {
    expect(validateImage({ buffer: Buffer.from("not an image") })).toMatchObject(
      { ok: false, code: "UNSUPPORTED_TYPE" },
    );
  });

  it("exposes the allow-list mapping", () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual({
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    });
  });
});
