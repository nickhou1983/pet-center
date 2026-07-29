import Link from "next/link";

const featureCards = [
  {
    icon: "📝",
    title: "备案登记",
    description: "提前记录照片、特征与联系方式，走失时能更快被匹配。",
  },
  {
    icon: "📍",
    title: "走失找回",
    description: "发布走失信息，让照片与描述进入同一套相似度搜索。",
  },
  {
    icon: "🤝",
    title: "捡到招领",
    description: "记录捡到地点与线索，帮助主人通过 AI 搜索发现它。",
  },
  {
    icon: "🏡",
    title: "领养",
    description: "用清晰资料展示待领养宠物，方便爱心家庭了解情况。",
  },
];

const steps = [
  "上传照片并填写关键描述",
  "AI 生成向量并按相似度匹配",
  "查看详情，联系宠物主人或发布人",
];

export default function Home() {
  return (
    <main className="flex-1 bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <section className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground/50">
              宠物备案 · 走失找回 · 捡到招领 · 领养
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              用照片和描述，更快找到它
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-8 text-foreground/60 sm:text-lg">
              Pet Center 将宠物信息登记、发布与 CLIP AI 相似度搜索放在一起，帮走失、捡到与领养信息更容易被看见。
            </p>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/search"
              className="rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              智能搜索
            </Link>
            <Link
              href="/publish"
              className="rounded-lg border border-foreground/15 px-6 py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              发布宠物信息
            </Link>
          </div>
        </section>

        <section aria-labelledby="features-title" className="space-y-5">
          <h2 id="features-title" className="text-xl font-semibold tracking-tight">
            覆盖常见宠物信息场景
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-foreground/10 bg-foreground/5 p-5"
              >
                <div className="text-2xl" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/60">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-foreground/10 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-medium text-foreground/50">如何工作</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                从线索到联系，只保留必要步骤
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step}
                  className="rounded-2xl border border-foreground/10 bg-background p-4"
                >
                  <span className="text-xs font-semibold text-foreground/40">
                    0{index + 1}
                  </span>
                  <p className="mt-3 text-sm font-medium leading-6">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
