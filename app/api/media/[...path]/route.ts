import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { contentTypeForPath, resolveUploadPath } from "@/lib/media";
import { UPLOADS_DIR } from "@/lib/storage";

// Reads uploaded files from the local filesystem, so it needs the Node runtime.
export const runtime = "nodejs";

function notFound() {
  return new NextResponse("Not found", { status: 404 });
}

/**
 * GET /uploads/:path* (rewritten here from `next.config.mjs`) — stream a stored
 * upload from `public/uploads/`. Path traversal is rejected before any file
 * access. Serving through this handler keeps runtime uploads reachable under
 * both `next dev` and `next start`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  const filePath = resolveUploadPath(segments, UPLOADS_DIR);
  if (!filePath) {
    return notFound();
  }

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    return notFound();
  }

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForPath(filePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
