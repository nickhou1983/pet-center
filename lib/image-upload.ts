// Image upload validation.
//
// An allow-list of raster formats (JPEG / PNG / WebP) validated by the file's
// magic bytes (signature) plus size limits. Signature sniffing is authoritative:
// the client-declared MIME type is intentionally not trusted, so a client cannot
// spoof the content type by renaming a file or setting a bogus `Content-Type`.
// This module is intentionally free of any storage backend or HTTP framework so
// it is trivial to unit test.

/** Canonical (magic-byte-sniffed) MIME type -> extension for accepted formats. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Maximum size per uploaded file, in bytes. Default 5 MB. */
export const MAX_FILE_SIZE_BYTES = readPositiveIntEnv(
  "UPLOAD_MAX_FILE_SIZE_BYTES",
  5 * 1024 * 1024,
);

/** Maximum number of files accepted per request. Default 10. */
export const MAX_FILES = readPositiveIntEnv("UPLOAD_MAX_FILES", 10);

/**
 * Detect a supported image type from a buffer's magic bytes. Returns the
 * canonical MIME type, or `null` when the signature matches no allowed format.
 */
export function sniffImageType(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ValidationErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE";

export interface ValidationSuccess {
  ok: true;
  /** Canonical MIME type derived from the file signature. */
  type: string;
  /** Canonical extension (no leading dot). */
  extension: string;
}

export interface ValidationFailure {
  ok: false;
  code: ValidationErrorCode;
  message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface ValidateImageInput {
  buffer: Buffer;
}

export interface ValidateImageOptions {
  /** Override the size limit (defaults to {@link MAX_FILE_SIZE_BYTES}). */
  maxSizeBytes?: number;
}

/**
 * Validate a single uploaded image: non-empty, within the size limit, and a
 * supported image signature. The file's magic bytes are authoritative — the
 * client-declared MIME type is intentionally not trusted, so a mislabeled or
 * unlabeled (`application/octet-stream`) but genuinely valid image is accepted,
 * while anything whose bytes are not JPEG/PNG/WebP is rejected.
 */
export function validateImage(
  input: ValidateImageInput,
  options: ValidateImageOptions = {},
): ValidationResult {
  const maxSize = options.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const { buffer } = input;

  if (buffer.length === 0) {
    return { ok: false, code: "EMPTY_FILE", message: "File is empty." };
  }

  if (buffer.length > maxSize) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `File exceeds the maximum size of ${maxSize} bytes.`,
    };
  }

  const sniffed = sniffImageType(buffer);
  if (!sniffed || !(sniffed in ALLOWED_IMAGE_TYPES)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "Unsupported file type. Allowed types: JPEG, PNG, WebP.",
    };
  }

  return { ok: true, type: sniffed, extension: ALLOWED_IMAGE_TYPES[sniffed] };
}
