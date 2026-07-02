export type SearchMode = "image" | "text" | "hybrid";

export interface SearchWeights {
  image: number;
  text: number;
}

export function l2Normalize(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector.slice();
  return vector.map((value) => value / norm);
}

function toNonNegativeNumber(
  value: unknown,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallback;
}

export function resolveSearchMode(input: {
  mode?: unknown;
  hasImage: boolean;
  hasText: boolean;
}): SearchMode {
  const { mode, hasImage, hasText } = input;
  if (!hasImage && !hasText) {
    throw new Error("At least one query input is required: image or description.");
  }

  if (mode === "image" || mode === "text" || mode === "hybrid") {
    if (mode === "image" && !hasImage) {
      throw new Error("mode=image requires an image query.");
    }
    if (mode === "text" && !hasText) {
      throw new Error("mode=text requires a description query.");
    }
    if (mode === "hybrid" && (!hasImage || !hasText)) {
      throw new Error("mode=hybrid requires both image and description.");
    }
    return mode;
  }

  if (hasImage && hasText) return "hybrid";
  return hasImage ? "image" : "text";
}

export function resolveSearchWeights(
  mode: SearchMode,
  input: {
    imageWeight?: unknown;
    textWeight?: unknown;
  },
): SearchWeights {
  if (mode === "image") return { image: 1, text: 0 };
  if (mode === "text") return { image: 0, text: 1 };

  const rawImage = toNonNegativeNumber(input.imageWeight, 0.6);
  const rawText = toNonNegativeNumber(input.textWeight, 0.4);
  const sum = rawImage + rawText;

  if (sum <= 0) {
    throw new Error("imageWeight + textWeight must be greater than 0.");
  }

  return {
    image: rawImage / sum,
    text: rawText / sum,
  };
}

export function toBoundedPositiveInt(
  value: unknown,
  fallback: number,
  options: { min: number; max: number },
): number {
  let parsed = fallback;

  if (typeof value === "number" && Number.isFinite(value)) {
    parsed = Math.trunc(value);
  } else if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number.parseInt(value, 10);
    if (Number.isFinite(asNumber)) parsed = asNumber;
  }

  if (parsed < options.min) return options.min;
  if (parsed > options.max) return options.max;
  return parsed;
}
