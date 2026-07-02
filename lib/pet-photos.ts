import { resolveUploadPath } from "./media";
import { UPLOADS_DIR, UPLOADS_PUBLIC_PATH } from "./storage";

// Server-only helpers that map a public `/uploads/<file>` path (as produced by
// `POST /api/upload`) back to an absolute file path inside the uploads
// directory. `POST /api/pets` reads the first photo's bytes to generate its CLIP
// embedding, so these helpers gate which files may be read: only paths under the
// public uploads prefix that resolve within `UPLOADS_DIR` are accepted. This
// prevents a caller from pointing `photos` at arbitrary local files (local file
// inclusion) via traversal or absolute paths. Path-only logic (no fs access), so
// it is easy to unit test.

/** True when `value` looks like a public uploads path, e.g. `/uploads/x.jpg`. */
export function isUploadPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${UPLOADS_PUBLIC_PATH}/`);
}

/**
 * Resolve a public `/uploads/<file>` path to an absolute on-disk path inside
 * {@link UPLOADS_DIR}, or `null` when the input is not an uploads path or would
 * escape the uploads directory (traversal / absolute path).
 */
export function resolvePhotoFile(publicPath: string): string | null {
  if (!isUploadPath(publicPath)) return null;
  const relative = publicPath.slice(UPLOADS_PUBLIC_PATH.length).replace(/^\/+/, "");
  const segments = relative.split("/");
  return resolveUploadPath(segments, UPLOADS_DIR);
}
