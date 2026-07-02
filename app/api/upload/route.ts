import { NextResponse } from "next/server";

import {
  MAX_FILES,
  validateImage,
  type ValidationErrorCode,
} from "@/lib/image-upload";
import { getStorage } from "@/lib/storage";

// Local filesystem writes require the Node.js runtime (matches api/health).
export const runtime = "nodejs";

/** Form field name that carries the uploaded file(s). Repeat it for multi-upload. */
const FIELD_NAME = "files";

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
}

/** HTTP status for each validation failure code. */
const STATUS_BY_CODE: Record<ValidationErrorCode, number> = {
  EMPTY_FILE: 400,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_TYPE: 415,
};

function errorResponse(
  status: number,
  code: string,
  error: string,
  filename?: string,
) {
  return NextResponse.json(
    filename ? { error, code, filename } : { error, code },
    { status },
  );
}

/**
 * POST /api/upload — accept one or more images as `multipart/form-data` under
 * the `files` field, validate them, persist them via the configured storage
 * provider, and return the accessible URLs.
 *
 * Validation is atomic: if any file is invalid the whole request is rejected
 * and nothing is written.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Request body must be multipart/form-data.",
    );
  }

  const files = formData
    .getAll(FIELD_NAME)
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return errorResponse(
      400,
      "EMPTY_REQUEST",
      `No files provided. Attach one or more files under the "${FIELD_NAME}" field.`,
    );
  }

  if (files.length > MAX_FILES) {
    return errorResponse(
      400,
      "TOO_MANY_FILES",
      `Too many files. A maximum of ${MAX_FILES} files may be uploaded per request.`,
    );
  }

  // Read and validate every file up front so we never write a partial batch.
  const prepared: {
    buffer: Buffer;
    type: string;
    extension: string;
  }[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = validateImage({ buffer });

    if (!result.ok) {
      return errorResponse(
        STATUS_BY_CODE[result.code] ?? 400,
        result.code,
        result.message,
        file.name || undefined,
      );
    }

    prepared.push({
      buffer,
      type: result.type,
      extension: result.extension,
    });
  }

  const storage = getStorage();
  const saved: UploadedFile[] = [];

  try {
    for (const item of prepared) {
      const object = await storage.save(item.buffer, {
        contentType: item.type,
        extension: item.extension,
      });
      saved.push({
        url: object.url,
        filename: object.key,
        size: object.size,
        type: object.contentType,
      });
    }
  } catch {
    return errorResponse(
      500,
      "STORAGE_ERROR",
      "Failed to store the uploaded file(s).",
    );
  }

  return NextResponse.json({ files: saved }, { status: 201 });
}
