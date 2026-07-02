import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Image storage abstraction.
//
// The prototype persists uploads on the local filesystem under
// `public/uploads/` (served statically by Next.js). Everything goes through the
// `StorageProvider` interface so the backend can later be swapped for object
// storage (S3/OSS) without touching the upload route or its callers — implement
// `StorageProvider` and return it from `getStorage()`.

/** A stored object as returned by a {@link StorageProvider}. */
export interface SavedObject {
  /** Storage key relative to the provider root, e.g. `"a1b2c3.jpg"`. */
  key: string;
  /** Publicly accessible URL/path, e.g. `"/uploads/a1b2c3.jpg"`. */
  url: string;
  /** Size in bytes of the written object. */
  size: number;
  /** MIME content type the object was stored as. */
  contentType: string;
}

export interface SaveOptions {
  /** MIME type, e.g. `"image/jpeg"`. */
  contentType: string;
  /** Canonical file extension without a leading dot, e.g. `"jpg"`. */
  extension: string;
}

/**
 * A pluggable storage backend. Implementations must generate a unique key so
 * concurrent uploads never overwrite each other.
 */
export interface StorageProvider {
  save(data: Buffer, options: SaveOptions): Promise<SavedObject>;
}

export interface LocalStorageOptions {
  /** Directory files are written to. Defaults to `<cwd>/public/uploads`. */
  baseDir?: string;
  /** Public URL prefix the `baseDir` is served under. Defaults to `/uploads`. */
  publicPath?: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "public", "uploads");
const DEFAULT_PUBLIC_PATH = "/uploads";

/** Directory the local provider writes uploaded files to. */
export const UPLOADS_DIR = DEFAULT_BASE_DIR;

/** Public URL prefix that {@link UPLOADS_DIR} is served under. */
export const UPLOADS_PUBLIC_PATH = DEFAULT_PUBLIC_PATH;

/**
 * Local-filesystem storage provider. Writes each object under `baseDir` with a
 * random UUID filename and returns the URL it is served under. The target
 * directory is created on demand.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;
  private readonly publicPath: string;

  constructor(options: LocalStorageOptions = {}) {
    this.baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
    // Strip any trailing slash so URL joining never produces a double slash.
    this.publicPath = (options.publicPath ?? DEFAULT_PUBLIC_PATH).replace(
      /\/+$/,
      "",
    );
  }

  async save(data: Buffer, options: SaveOptions): Promise<SavedObject> {
    const key = `${randomUUID()}.${options.extension}`;
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(path.join(this.baseDir, key), data);
    return {
      key,
      url: `${this.publicPath}/${key}`,
      size: data.byteLength,
      contentType: options.contentType,
    };
  }
}

let cachedProvider: StorageProvider | undefined;

/**
 * Return the configured storage provider. For now this is always the local
 * filesystem provider; this is the single place to switch to object storage
 * later. The instance is cached per process.
 */
export function getStorage(): StorageProvider {
  if (!cachedProvider) {
    cachedProvider = new LocalStorageProvider();
  }
  return cachedProvider;
}
