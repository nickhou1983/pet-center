import { NextResponse } from "next/server";

import {
  getImageEmbedding,
  getTextEmbedding,
  MODEL_ID,
  preloadClip,
} from "@/lib/clip";
import { EMBEDDING_DIM, cosineSimilarity } from "@/lib/vector";

// Diagnostic self-test for the CLIP vector service (M3).
//
// GET /api/vector runs a self-test that proves the acceptance criteria:
//   1. image & text both encode to 512-dim, L2-normalized vectors;
//   2. in the shared space, each image is most similar to its own paired text
//      (cross-modal semantic alignment);
//   3. the model is loaded once — a warm call after load is much faster.
//
// Probe your own inputs with query params (non-production only — see the guard
// in GET), e.g.
//   /api/vector?text=a%20small%20brown%20dog
//   /api/vector?image=https://.../photo.jpg
//   /api/vector?text=a%20cat&image=https://.../cat.jpg   (returns their similarity)
//
// NOTE: the first request downloads the CLIP model (~300MB) and the sample
// images from the Hugging Face Hub, so it needs network access and can be slow;
// later requests hit the on-disk cache and the in-process model singleton.
//
// transformers.js needs native Node addons, so this route must run on Node.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_BASE =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main";

// Image ↔ paired-text samples spanning distinct concepts, so a correctly
// aligned model scores each image highest against its own description.
const SAMPLES = [
  {
    label: "football",
    image: `${SAMPLE_BASE}/football-match.jpg`,
    text: "a photo of a football match",
  },
  {
    label: "cats",
    image: `${SAMPLE_BASE}/cats.jpg`,
    text: "a photo of two cats",
  },
  {
    label: "tiger",
    image: `${SAMPLE_BASE}/tiger.jpg`,
    text: "a photo of a tiger",
  },
] as const;

function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Embed caller-supplied text and/or image and (if both) their similarity. */
async function probe(text: string | null, image: string | null) {
  const result: Record<string, unknown> = { modelId: MODEL_ID, dim: EMBEDDING_DIM };
  let textVector: number[] | undefined;
  let imageVector: number[] | undefined;

  if (text) {
    textVector = await getTextEmbedding(text);
    result.text = {
      input: text,
      dim: textVector.length,
      norm: round(vectorNorm(textVector)),
      preview: textVector.slice(0, 8).map((n) => round(n)),
    };
  }
  if (image) {
    imageVector = await getImageEmbedding(image);
    result.image = {
      input: image,
      dim: imageVector.length,
      norm: round(vectorNorm(imageVector)),
      preview: imageVector.slice(0, 8).map((n) => round(n)),
    };
  }
  if (textVector && imageVector) {
    result.similarity = round(cosineSimilarity(imageVector, textVector));
  }
  return result;
}

async function selfTest() {
  // Cold load (one-time model download / init).
  const loadStart = performance.now();
  await preloadClip();
  const coldLoadMs = Math.round(performance.now() - loadStart);

  const labels = SAMPLES.map((sample) => sample.label);
  const imageVectors = await Promise.all(
    SAMPLES.map((sample) => getImageEmbedding(sample.image)),
  );
  const textVectors = await Promise.all(
    SAMPLES.map((sample) => getTextEmbedding(sample.text)),
  );

  // A warm call after loading — should be far faster than coldLoadMs, proving
  // the model was cached and not reloaded.
  const warmStart = performance.now();
  await getTextEmbedding("a warm cache probe");
  const warmTextCallMs = Math.round(performance.now() - warmStart);

  // Cross-modal similarity matrix: rows = images, cols = texts.
  const matrix = imageVectors.map((imageVector) =>
    textVectors.map((textVector) =>
      round(cosineSimilarity(imageVector, textVector)),
    ),
  );
  const bestTextPerImage = matrix.map(
    (row) => labels[row.indexOf(Math.max(...row))],
  );

  const allVectors = [...imageVectors, ...textVectors];
  const allVectorsAreDim512 = allVectors.every((v) => v.length === EMBEDDING_DIM);
  const allVectorsAreUnitNorm = allVectors.every(
    (v) => Math.abs(vectorNorm(v) - 1) < 1e-3,
  );
  const everyImageMatchesItsPairedText = bestTextPerImage.every(
    (best, i) => best === labels[i],
  );

  // Gap between the correct pair and the strongest mismatching text per image —
  // makes "paired similarity is significantly higher" visible.
  const crossModalPairing = SAMPLES.map((sample, i) => {
    const pairedSimilarity = matrix[i][i];
    const bestOtherSimilarity = Math.max(
      ...matrix[i].filter((_, j) => j !== i),
    );
    return {
      label: sample.label,
      pairedSimilarity,
      bestOtherSimilarity: round(bestOtherSimilarity),
      gap: round(pairedSimilarity - bestOtherSimilarity),
    };
  });

  const status =
    allVectorsAreDim512 &&
    allVectorsAreUnitNorm &&
    everyImageMatchesItsPairedText
      ? "ok"
      : "degraded";

  return {
    status,
    modelId: MODEL_ID,
    dim: EMBEDDING_DIM,
    checks: {
      allVectorsAreDim512,
      allVectorsAreUnitNorm,
      everyImageMatchesItsPairedText,
    },
    similarityMatrix: {
      rows: labels.map((label) => `${label} (image)`),
      cols: labels.map((label) => `${label} (text)`),
      values: matrix,
      bestTextPerImage,
    },
    crossModalPairing,
    timings: {
      coldLoadMs,
      warmTextCallMs,
      note: "coldLoadMs includes the one-time model load; warmTextCallMs is a later call, so a much smaller value proves the model singleton was reused (loaded once).",
    },
    samples: SAMPLES,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const image = searchParams.get("image");

  // The ?text=/?image= probe encodes caller-supplied input; the image probe in
  // particular fetches an arbitrary URL server-side (RawImage.fromURL), which
  // would be a server-side request forgery (SSRF) vector on a public deployment
  // — a caller could target internal addresses (cloud metadata, other internal
  // services) or oversized responses to exhaust resources. Restrict the probe to
  // non-production; the fixed-sample self-test (trusted SAMPLES only, no
  // user-controlled fetch) stays available everywhere.
  if ((text || image) && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        status: "forbidden",
        message:
          "The ?text=/?image= probe is disabled in production. Call GET /api/vector with no query params to run the fixed-sample self-test.",
      },
      { status: 403 },
    );
  }

  try {
    const payload =
      text || image ? await probe(text, image) : await selfTest();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        hint: "The first request downloads the CLIP model (~300MB) and sample images from the Hugging Face Hub — this needs network access and can take a while.",
      },
      { status: 500 },
    );
  }
}
