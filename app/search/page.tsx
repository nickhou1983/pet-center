"use client";

import { useMemo, useState } from "react";

interface SearchResultItem {
  id: string;
  category: string;
  species: string;
  breed: string | null;
  color: string | null;
  size: string | null;
  region: string | null;
  description: string | null;
  photos: string[];
  score: number;
  simImage: number | null;
  simText: number | null;
}

interface SearchResponse {
  mode: "image" | "text" | "hybrid";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  weights: { image: number; text: number };
  results: SearchResultItem[];
}

const DEFAULT_PAGE_SIZE = 12;

export default function SearchPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [region, setRegion] = useState("");
  const [imageWeight, setImageWeight] = useState("0.6");
  const [textWeight, setTextWeight] = useState("0.4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  const canSearch = useMemo(
    () => !!imageFile || description.trim().length > 0,
    [description, imageFile],
  );

  async function runSearch(page = 1) {
    if (!canSearch) {
      setError("请至少上传一张查询照片或填写描述。");
      return;
    }

    const formData = new FormData();
    if (imageFile) formData.append("image", imageFile);
    if (description.trim()) formData.append("description", description.trim());
    if (category) formData.append("category", category);
    if (species) formData.append("species", species);
    if (breed.trim()) formData.append("breed", breed.trim());
    if (color.trim()) formData.append("color", color.trim());
    if (size) formData.append("size", size);
    if (region.trim()) formData.append("region", region.trim());
    formData.append("imageWeight", imageWeight || "0.6");
    formData.append("textWeight", textWeight || "0.4");
    formData.append("page", String(page));
    formData.append("pageSize", String(DEFAULT_PAGE_SIZE));

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "搜索失败，请稍后重试。");
        return;
      }
      setResponse(data as SearchResponse);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">混合搜索（照片 + 描述）</h1>

      <section className="grid gap-3 rounded-lg border border-foreground/10 p-4 md:grid-cols-2">
        <label className="text-sm">
          查询照片
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="text-sm">
          描述
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="如：一只中型棕色短毛狗"
          />
        </label>

        <label className="text-sm">
          category
          <select
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">全部</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="LOST">LOST</option>
            <option value="FOUND">FOUND</option>
            <option value="ADOPTION">ADOPTION</option>
          </select>
        </label>

        <label className="text-sm">
          species
          <select
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
          >
            <option value="">全部</option>
            <option value="DOG">DOG</option>
            <option value="CAT">CAT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>

        <label className="text-sm">
          breed
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
          />
        </label>

        <label className="text-sm">
          color
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>

        <label className="text-sm">
          size
          <select
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            <option value="">全部</option>
            <option value="SMALL">SMALL</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LARGE">LARGE</option>
          </select>
        </label>

        <label className="text-sm">
          region
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          />
        </label>

        <label className="text-sm">
          图权重 imageWeight
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={imageWeight}
            onChange={(event) => setImageWeight(event.target.value)}
          />
        </label>

        <label className="text-sm">
          文权重 textWeight
          <input
            className="mt-1 block w-full rounded border border-foreground/20 p-2 text-sm"
            value={textWeight}
            onChange={(event) => setTextWeight(event.target.value)}
          />
        </label>

        <div className="md:col-span-2">
          <button
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={loading}
            onClick={() => runSearch(1)}
            type="button"
          >
            {loading ? "搜索中..." : "开始搜索"}
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {response ? (
        <section className="space-y-4">
          <p className="text-sm text-foreground/70">
            模式：{response.mode}｜总数：{response.total}｜页码：{response.page}/
            {response.totalPages}｜权重：img={response.weights.image.toFixed(2)}, text=
            {response.weights.text.toFixed(2)}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {response.results.map((item) => (
              <article
                className="space-y-2 rounded-lg border border-foreground/10 p-3"
                key={item.id}
              >
                {item.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={item.description ?? item.id}
                    className="h-40 w-full rounded object-cover"
                    src={item.photos[0]}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded bg-foreground/5 text-sm text-foreground/40">
                    无缩略图
                  </div>
                )}

                <div className="space-y-1 text-sm">
                  <p className="font-semibold">匹配分数：{item.score.toFixed(4)}</p>
                  <p>
                    {item.category} · {item.species}
                    {item.size ? ` · ${item.size}` : ""}
                  </p>
                  <p>{item.breed ?? "未知品种"}</p>
                  <p>{item.color ?? "未知颜色"}</p>
                  <p>{item.region ?? "未知地区"}</p>
                  <a className="text-blue-600 underline" href={`/pets/${item.id}`}>
                    查看详情
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded border border-foreground/20 px-3 py-1 text-sm disabled:opacity-50"
              disabled={loading || response.page <= 1}
              onClick={() => runSearch(response.page - 1)}
              type="button"
            >
              上一页
            </button>
            <button
              className="rounded border border-foreground/20 px-3 py-1 text-sm disabled:opacity-50"
              disabled={loading || response.page >= response.totalPages}
              onClick={() => runSearch(response.page + 1)}
              type="button"
            >
              下一页
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
