import path from "node:path";

import { describe, expect, it } from "vitest";

import { contentTypeForPath, resolveUploadPath } from "../media";

describe("contentTypeForPath", () => {
  it("maps known image extensions", () => {
    expect(contentTypeForPath("a.jpg")).toBe("image/jpeg");
    expect(contentTypeForPath("a.JPEG")).toBe("image/jpeg");
    expect(contentTypeForPath("a.png")).toBe("image/png");
    expect(contentTypeForPath("dir/a.webp")).toBe("image/webp");
  });

  it("falls back to octet-stream for unknown extensions", () => {
    expect(contentTypeForPath("a.txt")).toBe("application/octet-stream");
    expect(contentTypeForPath("noext")).toBe("application/octet-stream");
  });
});

describe("resolveUploadPath", () => {
  const base = path.resolve("/srv/uploads");

  it("resolves a normal filename inside the base dir", () => {
    expect(resolveUploadPath(["photo.png"], base)).toBe(
      path.join(base, "photo.png"),
    );
  });

  it("resolves nested segments", () => {
    expect(resolveUploadPath(["2024", "photo.jpg"], base)).toBe(
      path.join(base, "2024", "photo.jpg"),
    );
  });

  it("returns null for empty segments", () => {
    expect(resolveUploadPath([], base)).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(resolveUploadPath(["..", "secret.txt"], base)).toBeNull();
    expect(resolveUploadPath(["a", "..", "..", "etc"], base)).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(resolveUploadPath(["/etc/passwd"], base)).toBeNull();
  });
});
