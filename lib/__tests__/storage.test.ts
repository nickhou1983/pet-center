import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalStorageProvider } from "../storage";

describe("LocalStorageProvider", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "pet-center-uploads-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the file and returns a servable URL", async () => {
    const provider = new LocalStorageProvider({
      baseDir: dir,
      publicPath: "/uploads",
    });
    const data = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

    const object = await provider.save(data, {
      contentType: "image/jpeg",
      extension: "jpg",
    });

    expect(object.key).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(object.url).toBe(`/uploads/${object.key}`);
    expect(object.size).toBe(data.byteLength);
    expect(object.contentType).toBe("image/jpeg");

    const written = await readFile(path.join(dir, object.key));
    expect(written.equals(data)).toBe(true);
  });

  it("creates the base directory on demand", async () => {
    const nested = path.join(dir, "does", "not", "exist");
    const provider = new LocalStorageProvider({ baseDir: nested });

    const object = await provider.save(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
      contentType: "image/png",
      extension: "png",
    });

    const written = await readFile(path.join(nested, object.key));
    expect(written.byteLength).toBe(4);
  });

  it("normalizes a trailing slash in the public path", async () => {
    const provider = new LocalStorageProvider({
      baseDir: dir,
      publicPath: "/uploads/",
    });

    const object = await provider.save(Buffer.from([0x89]), {
      contentType: "image/png",
      extension: "png",
    });

    expect(object.url).toBe(`/uploads/${object.key}`);
  });

  it("generates a unique key for every save", async () => {
    const provider = new LocalStorageProvider({ baseDir: dir });
    const opts = { contentType: "image/png", extension: "png" } as const;

    const a = await provider.save(Buffer.from([1]), opts);
    const b = await provider.save(Buffer.from([1]), opts);

    expect(a.key).not.toBe(b.key);
  });
});
