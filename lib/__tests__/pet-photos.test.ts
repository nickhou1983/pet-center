// This file is AI-generated for testing pet-photos.ts (M5).
// Unit tests for the server-only photo-path resolver. The security-relevant
// behavior is that only paths under the public uploads prefix that resolve
// *inside* UPLOADS_DIR are accepted; traversal and non-uploads paths return
// null, so `POST /api/pets` can never read arbitrary local files.

import path from "node:path";

import { describe, expect, it } from "vitest";

import { isUploadPath, resolvePhotoFile } from "../pet-photos";
import { UPLOADS_DIR } from "../storage";

describe("isUploadPath", () => {
  it("accepts public uploads paths", () => {
    expect(isUploadPath("/uploads/a.jpg")).toBe(true);
    expect(isUploadPath("/uploads/nested/b.webp")).toBe(true);
  });

  it("rejects non-uploads and non-string inputs", () => {
    expect(isUploadPath("/etc/passwd")).toBe(false);
    expect(isUploadPath("uploads/a.jpg")).toBe(false);
    expect(isUploadPath("http://x/a.jpg")).toBe(false);
    expect(isUploadPath(null)).toBe(false);
    expect(isUploadPath(42)).toBe(false);
  });
});

describe("resolvePhotoFile", () => {
  it("resolves a valid uploads path to a file inside UPLOADS_DIR", () => {
    const resolved = resolvePhotoFile("/uploads/a1b2c3.jpg");
    expect(resolved).toBe(path.join(UPLOADS_DIR, "a1b2c3.jpg"));
    expect(resolved?.startsWith(UPLOADS_DIR)).toBe(true);
  });

  it("returns null for non-uploads paths", () => {
    expect(resolvePhotoFile("/etc/passwd")).toBeNull();
    expect(resolvePhotoFile("a1b2c3.jpg")).toBeNull();
  });

  it("returns null for path traversal attempts", () => {
    expect(resolvePhotoFile("/uploads/../secret.txt")).toBeNull();
    expect(resolvePhotoFile("/uploads/../../etc/passwd")).toBeNull();
  });
});
