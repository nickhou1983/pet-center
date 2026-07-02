/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
} from "@/lib/pet-labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep the precise enum-keyed types from pet-labels.ts (do not widen to
// Record<string, string>) so a missing/renamed enum value fails to compile.
const categoryLabels = CATEGORY_LABELS;
const genderLabels = GENDER_LABELS;
const sizeLabels = SIZE_LABELS;
const speciesLabels = SPECIES_LABELS;
const statusLabels = STATUS_LABELS;

function isPresent(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pet = await prisma.pet.findUnique({ where: { id } });

  if (!pet) {
    notFound();
  }

  let embeddingDim: number | null = null;

  try {
    const rows = await prisma.$queryRaw<{ dim: number | null }[]>`
      SELECT vector_dims("imageEmbedding") AS "dim" FROM "pets" WHERE "id" = ${id}
    `;

    embeddingDim = typeof rows[0]?.dim === "number" ? rows[0].dim : null;
  } catch {
    embeddingDim = null;
  }

  const photos = pet.photos ?? [];
  const title =
    pet.name ??
    [categoryLabels[pet.category], speciesLabels[pet.species]]
      .filter(Boolean)
      .join(" · ");
  const attributes = [
    ["物种", speciesLabels[pet.species]],
    ["品种", pet.breed],
    ["颜色", pet.color],
    ["体型", pet.size ? sizeLabels[pet.size] : null],
    ["性别", genderLabels[pet.gender]],
    ["年龄", pet.age !== null ? `${pet.age} 岁` : null],
    ["地区", pet.region],
    ["名字", pet.name],
  ].filter(([, value]) => isPresent(value));

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-foreground/10 px-4 py-2 text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            ← 返回首页
          </Link>
          <Link
            href="/publish"
            className="rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
          >
            继续发布
          </Link>
        </nav>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start">
          <div className="space-y-3">
            {photos.length > 0 ? (
              <>
                <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-foreground/5">
                  <img
                    src={photos[0]}
                    alt={`${title} 的照片`}
                    className="h-[360px] w-full object-cover sm:h-[520px]"
                  />
                </div>
                {photos.length > 1 ? (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {photos.slice(1).map((photo, index) => (
                      <div
                        key={photo}
                        className="overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/5"
                      >
                        <img
                          src={photo}
                          alt={`${title} 的补充照片 ${index + 2}`}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-foreground/20 bg-foreground/5 text-sm text-foreground/50 sm:h-[520px]">
                暂无照片
              </div>
            )}
          </div>

          <article className="rounded-3xl border border-foreground/10 bg-background p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                {categoryLabels[pet.category]}
              </span>
              <span className="rounded-full border border-foreground/15 px-3 py-1 text-xs font-semibold text-foreground/70">
                {speciesLabels[pet.species]}
              </span>
              <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
                {statusLabels[pet.status] ?? pet.status}
              </span>
              {embeddingDim ? (
                <span className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground/60">
                  AI 向量已生成 · {embeddingDim} 维
                </span>
              ) : null}
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-foreground/50">
                宠物信息详情
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {title}
              </h1>
              {pet.region ? (
                <p className="text-base text-foreground/60">{pet.region}</p>
              ) : null}
            </div>

            <section className="mt-8">
              <h2 className="text-sm font-semibold text-foreground/70">
                基本属性
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {attributes.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3"
                  >
                    <dt className="text-xs text-foreground/50">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {pet.description ? (
              <section className="mt-8 rounded-2xl border border-foreground/10 p-4">
                <h2 className="text-sm font-semibold text-foreground/70">
                  描述
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/70">
                  {pet.description}
                </p>
              </section>
            ) : null}

            {pet.contactName || pet.contactPhone ? (
              <section className="mt-8 rounded-2xl bg-foreground p-5 text-background">
                <h2 className="text-sm font-semibold">联系方式</h2>
                <div className="mt-3 space-y-2 text-sm text-background/80">
                  {pet.contactName ? <p>联系人：{pet.contactName}</p> : null}
                  {pet.contactPhone ? <p>电话：{pet.contactPhone}</p> : null}
                </div>
              </section>
            ) : null}

            <p className="mt-8 text-xs text-foreground/50">
              创建于 {pet.createdAt.toLocaleString("zh-CN")}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
