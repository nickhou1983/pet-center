import Link from "next/link";

import PetCard from "@/components/PetCard";
import { CATEGORY_LABELS } from "@/lib/pet-labels";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Emoji icon for each category entry. */
const CATEGORY_ICONS: Record<string, string> = {
  LOST: "😿",
  FOUND: "🤝",
  ADOPTION: "🏠",
  REGISTERED: "📋",
};

/** Short description for each category. */
const CATEGORY_DESC: Record<string, string> = {
  LOST: "发布或查找走失宠物信息",
  FOUND: "发布或查找捡到宠物信息",
  ADOPTION: "发布或寻找待领养宠物",
  REGISTERED: "查看已备案宠物档案",
};

export default async function Home() {
  // Fetch the 6 most-recently published active pets for the "latest" section
  const latestPets = await prisma.pet.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      category: true,
      species: true,
      size: true,
      gender: true,
      status: true,
      name: true,
      breed: true,
      color: true,
      age: true,
      region: true,
      photos: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center gap-6 px-5 py-20 text-center sm:px-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">🐾 Pet Center</h1>
          <p className="text-lg text-foreground/70">
            宠物信息平台 · 备案登记 · 走失找回 · 领养
          </p>
        </div>

        <p className="max-w-xl text-sm leading-relaxed text-foreground/60">
          上传照片 + 文字描述 → 属性筛选 + AI 相似度排序 → 自动匹配备案宠物。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/pets"
            className="rounded-lg border border-foreground/20 px-6 py-3 text-sm font-medium transition-colors hover:border-foreground/40"
          >
            浏览全部信息
          </Link>
          <Link
            href="/publish"
            className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            发布宠物信息
          </Link>
        </div>
      </section>

      {/* ── Category entrances ───────────────────────────────────── */}
      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-xl font-bold tracking-tight">按分类浏览</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["LOST", "FOUND", "ADOPTION", "REGISTERED"] as const).map((cat) => (
              <Link
                key={cat}
                href={`/pets?category=${cat}`}
                className="flex flex-col items-center gap-3 rounded-3xl border border-foreground/10 bg-background px-4 py-8 text-center transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              >
                <span className="text-4xl">{CATEGORY_ICONS[cat]}</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-foreground/50">{CATEGORY_DESC[cat]}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest pets ──────────────────────────────────────────── */}
      {latestPets.length > 0 && (
        <section className="px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">最新发布</h2>
              <Link
                href="/pets"
                className="text-sm text-foreground/50 transition-colors hover:text-foreground"
              >
                查看全部 →
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestPets.map((pet) => (
                <li key={pet.id}>
                  <PetCard pet={pet} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Search CTA ───────────────────────────────────────────── */}
      <section className="px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-foreground/10 bg-foreground/5 px-8 py-12 text-center">
          <p className="text-2xl font-bold">🔍 找不到匹配的宠物？</p>
          <p className="mt-3 text-sm text-foreground/60">
            使用属性筛选精确查找，或发布走失 / 捡到信息让更多人看到。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pets"
              className="rounded-lg border border-foreground/20 px-5 py-2.5 text-sm font-medium transition-colors hover:border-foreground/40"
            >
              筛选浏览
            </Link>
            <Link
              href="/publish"
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              发布信息
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

