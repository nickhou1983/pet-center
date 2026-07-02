"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import ImageUploader from "@/components/publish/ImageUploader";
import ResultCard, { type SearchResult } from "@/components/search/ResultCard";
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
} from "@/lib/pet-labels";
import {
  GENDERS,
  PET_CATEGORIES,
  PET_SIZES,
  SPECIES,
} from "@/lib/pet-schema";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_WEIGHT,
  searchRequestSchema,
  type SearchMode,
} from "@/lib/search-schema";

// Hybrid search form (M6). Controlled component mirroring `searchRequestSchema`:
// the user uploads a query photo (reusing <ImageUploader/> → POST /api/upload),
// and/or types a description, sets attribute filters, and — when both a photo
// and text are present — tunes the image/text fusion weights. Submitting POSTs
// the query to /api/search and renders scored result cards with pagination.
// Pagination re-runs the *submitted* query (kept in a ref) so editing the form
// without re-searching doesn't change the current result set.

type FieldErrors = Record<string, string[] | undefined>;

interface SearchResponse {
  mode: SearchMode;
  weights: { image: number; text: number };
  page: number;
  pageSize: number;
  total: number;
  results: SearchResult[];
}

/** The submitted query payload (without paging), reused for page navigation. */
type SearchQuery = Record<string, unknown>;

const INPUT_CLASS =
  "w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40";

const MODE_LABELS: Record<SearchMode, string> = {
  image: "图搜图",
  text: "文搜图",
  fusion: "图文融合",
};

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-foreground/80"
    >
      {children}
    </label>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

export default function SearchForm() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("REGISTERED");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [wImage, setWImage] = useState(DEFAULT_WEIGHT);
  const [wText, setWText] = useState(DEFAULT_WEIGHT);

  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<SearchMode | null>(null);
  const [appliedWeights, setAppliedWeights] = useState<{
    image: number;
    text: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const lastQueryRef = useRef<SearchQuery | null>(null);

  const photo = photos[0];
  const hasImage = Boolean(photo);
  const hasText = description.trim().length > 0;
  const showWeights = hasImage && hasText;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));

  function buildQuery(): SearchQuery {
    return {
      photo: photo || undefined,
      description: description.trim() || undefined,
      wImage,
      wText,
      category: category || undefined,
      species: species || undefined,
      breed: breed.trim() || undefined,
      color: color.trim() || undefined,
      size: size || undefined,
      gender: gender || undefined,
      region: region.trim() || undefined,
    };
  }

  async function runSearch(query: SearchQuery, targetPage: number) {
    setLoading(true);
    setBanner(null);

    // First query may load the ~300MB CLIP model, so allow a generous timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...query,
          page: targetPage,
          pageSize: DEFAULT_PAGE_SIZE,
        }),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as
        | (Partial<SearchResponse> & {
            error?: string;
            fieldErrors?: FieldErrors;
            formErrors?: string[];
          })
        | null;

      if (response.ok && data?.results) {
        setResults(data.results);
        setTotal(data.total ?? 0);
        setMode(data.mode ?? null);
        setAppliedWeights(data.weights ?? null);
        setPage(targetPage);
        return;
      }

      if (response.status === 400 && data?.fieldErrors) {
        setErrors(data.fieldErrors);
        setBanner(data.formErrors?.[0] ?? data.error ?? "校验失败，请检查搜索条件。");
      } else {
        setBanner(data?.error ?? "搜索失败，请稍后重试。");
      }
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setBanner(
        timedOut
          ? "请求超时，请稍后重试（首次生成向量可能较慢）。"
          : "网络错误，请稍后重试。",
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setBanner(null);

    const query = buildQuery();
    const parsed = searchRequestSchema.safeParse({
      ...query,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setErrors(flat.fieldErrors);
      setBanner(flat.formErrors[0] ?? "请上传照片或填写描述后再搜索。");
      return;
    }

    lastQueryRef.current = query;
    await runSearch(query, 1);
  }

  function goToPage(targetPage: number) {
    if (loading || !lastQueryRef.current) return;
    if (targetPage < 1 || targetPage > totalPages) return;
    runSearch(lastQueryRef.current, targetPage);
  }

  const updateInput =
    (setter: (value: string) => void) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setter(event.target.value);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 lg:sticky lg:top-8"
        aria-label="混合搜索"
      >
        {banner ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600"
          >
            {banner}
          </p>
        ) : null}

        <fieldset>
          <Label>查询照片</Label>
          <p className="mb-3 text-xs text-foreground/50">
            上传一张照片做「图搜图」。与描述二者至少填一项。
          </p>
          <ImageUploader
            value={photos}
            onChange={setPhotos}
            maxFiles={1}
            disabled={loading}
          />
        </fieldset>

        <div>
          <Label htmlFor="description">描述</Label>
          <textarea
            id="description"
            value={description}
            onChange={updateInput(setDescription)}
            rows={3}
            placeholder="如：橘白色的小型田园猫，右耳有缺口"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.description} />
        </div>

        {showWeights ? (
          <fieldset className="space-y-3 rounded-xl border border-foreground/10 bg-foreground/5 p-4">
            <legend className="px-1 text-sm font-medium text-foreground/80">
              融合权重
            </legend>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
                <label htmlFor="wImage">图像权重</label>
                <span>{wImage.toFixed(2)}</span>
              </div>
              <input
                id="wImage"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={wImage}
                onChange={(event) => setWImage(Number(event.target.value))}
                disabled={loading}
                className="w-full accent-foreground"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
                <label htmlFor="wText">文本权重</label>
                <span>{wText.toFixed(2)}</span>
              </div>
              <input
                id="wText"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={wText}
                onChange={(event) => setWText(Number(event.target.value))}
                disabled={loading}
                className="w-full accent-foreground"
              />
            </div>
            <p className="text-[11px] text-foreground/50">
              提交时会自动归一化为总和 1。
            </p>
          </fieldset>
        ) : null}

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-foreground/80">
            属性筛选
          </legend>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">类别</Label>
              <select
                id="category"
                value={category}
                onChange={updateInput(setCategory)}
                className={INPUT_CLASS}
              >
                <option value="">不限</option>
                {PET_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="species">物种</Label>
              <select
                id="species"
                value={species}
                onChange={updateInput(setSpecies)}
                className={INPUT_CLASS}
              >
                <option value="">不限</option>
                {SPECIES.map((value) => (
                  <option key={value} value={value}>
                    {SPECIES_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="size">体型</Label>
              <select
                id="size"
                value={size}
                onChange={updateInput(setSize)}
                className={INPUT_CLASS}
              >
                <option value="">不限</option>
                {PET_SIZES.map((value) => (
                  <option key={value} value={value}>
                    {SIZE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="gender">性别</Label>
              <select
                id="gender"
                value={gender}
                onChange={updateInput(setGender)}
                className={INPUT_CLASS}
              >
                <option value="">不限</option>
                {GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {GENDER_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="breed">品种</Label>
              <input
                id="breed"
                value={breed}
                onChange={updateInput(setBreed)}
                placeholder="如：金毛"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <Label htmlFor="color">毛色</Label>
              <input
                id="color"
                value={color}
                onChange={updateInput(setColor)}
                placeholder="如：橘白"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="region">地区</Label>
            <input
              id="region"
              value={region}
              onChange={updateInput(setRegion)}
              placeholder="如：上海"
              className={INPUT_CLASS}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background"
                aria-hidden="true"
              />
              搜索中…（首次生成向量可能较慢）
            </>
          ) : (
            "搜索"
          )}
        </button>
      </form>

      <section aria-live="polite" className="min-h-[200px]">
        {results === null ? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-foreground/15 p-8 text-center text-sm text-foreground/50">
            上传照片或填写描述，点击「搜索」查看匹配的宠物。
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground/60">
              <p>
                共 <span className="font-semibold text-foreground">{total}</span>{" "}
                条结果
                {mode ? (
                  <>
                    {" "}
                    · 模式{" "}
                    <span className="font-medium text-foreground/80">
                      {MODE_LABELS[mode]}
                    </span>
                  </>
                ) : null}
                {mode === "fusion" && appliedWeights ? (
                  <>
                    {" "}
                    （图 {appliedWeights.image.toFixed(2)} / 文{" "}
                    {appliedWeights.text.toFixed(2)}）
                  </>
                ) : null}
              </p>
              {total > 0 ? (
                <p className="text-xs text-foreground/50">
                  第 {page} / {totalPages} 页
                </p>
              ) : null}
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center text-sm text-foreground/50">
                没有找到匹配的宠物，试试放宽属性筛选或调整描述。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={loading || page <= 1}
                  className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/70 transition-colors hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="text-sm text-foreground/60">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={loading || page >= totalPages}
                  className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/70 transition-colors hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
