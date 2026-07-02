import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from "@xenova/transformers";

import { EMBEDDING_DIM } from "./vector";

// CLIP image/text vector service (M3).
//
// Encodes both images and text into CLIP's shared 512-dimensional projection
// space so that image and text vectors are directly comparable by cosine
// similarity (image-to-image and text-to-image retrieval). This is the core
// engine behind "upload a photo + description → auto-match registered pets".
//
// The model (image tower, text tower, tokenizer, and image processor) is loaded
// once per process and cached (see the singleton below). transformers.js relies
// on native Node addons (onnxruntime-node, sharp), so this module MUST run on
// the Node.js runtime — never the Edge runtime. Any route importing it needs
// `export const runtime = "nodejs"` (see app/api/vector/route.ts) and the
// packages are marked external in next.config.mjs.

// --- transformers.js environment ---------------------------------------------

// Cache downloaded model files on disk so the ~300MB CLIP model is fetched from
// the Hugging Face Hub only on first use. The path is relative to the server
// process cwd (project root) and is git-ignored. `allowLocalModels = false`
// keeps loading predictable: always resolve from the Hub + this cache instead of
// the in-package `models/` directory.
env.cacheDir = process.env.TRANSFORMERS_CACHE ?? ".cache";
env.allowLocalModels = false;

/** The CLIP model used for both towers. Produces 512-dim (`EMBEDDING_DIM`) vectors. */
export const MODEL_ID = "Xenova/clip-vit-base-patch32";

/** Accepted image inputs for {@link getImageEmbedding}. */
export type ClipImageInput =
  | string // http(s) URL or local file path
  | URL
  | Blob
  | Uint8Array
  | ArrayBuffer
  | RawImage;

// --- model singleton ---------------------------------------------------------

type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
type TextModel = Awaited<
  ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>
>;
type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
type VisionModel = Awaited<
  ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>
>;

interface ClipComponents {
  tokenizer: Tokenizer;
  textModel: TextModel;
  processor: Processor;
  visionModel: VisionModel;
}

// Cache the load promise on globalThis. Loading is expensive (disk/network +
// ONNX session init) and must happen only once. globalThis also survives the
// module re-evaluation Next.js does on dev hot-reload, so the model isn't
// reloaded on every code change (mirrors the lib/prisma.ts singleton pattern).
const globalForClip = globalThis as unknown as {
  clipComponentsPromise?: Promise<ClipComponents>;
};

async function loadClipComponents(): Promise<ClipComponents> {
  const [tokenizer, textModel, processor, visionModel] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID),
    CLIPTextModelWithProjection.from_pretrained(MODEL_ID),
    AutoProcessor.from_pretrained(MODEL_ID),
    CLIPVisionModelWithProjection.from_pretrained(MODEL_ID),
  ]);
  return { tokenizer, textModel, processor, visionModel };
}

function getClip(): Promise<ClipComponents> {
  if (!globalForClip.clipComponentsPromise) {
    globalForClip.clipComponentsPromise = loadClipComponents().catch((error) => {
      // Don't cache a rejected load (e.g. a transient download failure) — clear
      // it so the next call retries with a fresh attempt.
      globalForClip.clipComponentsPromise = undefined;
      throw error;
    });
  }
  return globalForClip.clipComponentsPromise;
}

/**
 * Eagerly load the CLIP model into the process cache. Optional — the first
 * `getTextEmbedding` / `getImageEmbedding` call loads it lazily anyway — but
 * useful for warming up so the first real request isn't slow.
 */
export async function preloadClip(): Promise<void> {
  await getClip();
}

// --- embedding helpers -------------------------------------------------------

/** L2-normalize a vector so its Euclidean norm is 1 (cosine == dot product). */
function l2Normalize(vector: number[]): number[] {
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;
  const norm = Math.sqrt(sumOfSquares);
  if (norm === 0) return vector.slice();
  return vector.map((value) => value / norm);
}

/** Convert raw tensor output into a validated, L2-normalized 512-dim number[]. */
function toNormalizedEmbedding(data: ArrayLike<number>): number[] {
  const vector = Array.from(data, Number);
  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Expected CLIP embedding of length ${EMBEDDING_DIM}, received ${vector.length}.`,
    );
  }
  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new Error("CLIP produced a non-finite embedding value.");
    }
  }
  return l2Normalize(vector);
}

async function toRawImage(input: ClipImageInput): Promise<RawImage> {
  if (input instanceof RawImage) return input;
  if (typeof input === "string" || input instanceof URL) {
    return RawImage.fromURL(input);
  }
  if (input instanceof Blob) return RawImage.fromBlob(input);
  if (input instanceof Uint8Array) {
    return RawImage.fromBlob(new Blob([new Uint8Array(input)]));
  }
  if (input instanceof ArrayBuffer) {
    return RawImage.fromBlob(new Blob([new Uint8Array(input)]));
  }
  throw new Error("Unsupported image input type for getImageEmbedding.");
}

// --- public API --------------------------------------------------------------

/**
 * Encode text into a 512-dim, L2-normalized CLIP embedding (`number[]`) using
 * the text tower's projection head (`text_embeds`). Lives in the same space as
 * image embeddings, so text queries can be matched against image vectors.
 */
export async function getTextEmbedding(text: string): Promise<number[]> {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("getTextEmbedding requires a non-empty string.");
  }
  const { tokenizer, textModel } = await getClip();
  const inputs = tokenizer(text, { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  return toNormalizedEmbedding(text_embeds.data);
}

/**
 * Encode an image into a 512-dim, L2-normalized CLIP embedding (`number[]`)
 * using the vision tower's projection head (`image_embeds`). Accepts an http(s)
 * URL, a local file path, a `URL`, a `Blob`, a `Uint8Array`/`ArrayBuffer` of
 * image bytes, or a `RawImage`.
 */
export async function getImageEmbedding(
  input: ClipImageInput,
): Promise<number[]> {
  if (input === null || input === undefined) {
    throw new Error("getImageEmbedding requires an image input.");
  }
  const { processor, visionModel } = await getClip();
  const image = await toRawImage(input);
  const imageInputs = await processor(image);
  const { image_embeds } = await visionModel(imageInputs);
  return toNormalizedEmbedding(image_embeds.data);
}
