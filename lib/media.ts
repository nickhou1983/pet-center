import path from "node:path";

// Helpers for serving previously stored uploads over HTTP.
//
// `next start` builds its static `public/` manifest at boot, so files written to
// `public/uploads/` at runtime are NOT served by the static handler until the
// server restarts. To serve user uploads consistently in both `next dev` and
// `next start`, requests to `/uploads/*` are rewritten to a route handler (see
// `next.config.mjs` and `app/api/media/[...path]/route.ts`) that streams the
// file from disk using the helpers below. This route is also the natural seam
// for a future object-storage backend (it could redirect to a signed S3/OSS
// URL instead of reading the local filesystem).

/** File extension (no dot, lowercase) -> served Content-Type. */
export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Content-Type for a file path, falling back to a generic binary type. */
export function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return UPLOAD_CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Resolve URL path segments (from a `[...path]` route) to an absolute file path
 * inside `baseDir`. Returns `null` when the segments are empty or would escape
 * `baseDir` (path traversal), so the caller can respond 404 without ever
 * touching a file outside the uploads directory.
 */
export function resolveUploadPath(
  segments: string[],
  baseDir: string,
): string | null {
  if (!segments || segments.length === 0) return null;

  const normalized = path.normalize(segments.join("/"));
  if (path.isAbsolute(normalized) || normalized.split(/[/\\]/).includes("..")) {
    return null;
  }

  const root = path.resolve(baseDir);
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }

  return resolved;
}
