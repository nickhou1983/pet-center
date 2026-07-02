import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          🐾 Pet Center
        </h1>
        <p className="text-lg text-foreground/70">
          宠物信息平台 · 备案登记 · 走失找回 · 领养
        </p>
      </div>

      <p className="max-w-xl text-sm leading-relaxed text-foreground/60">
        上传照片 + 文字描述 → 属性筛选 + AI 相似度排序 → 自动匹配备案宠物。
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
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

      <div className="rounded-lg border border-foreground/10 px-4 py-2 text-xs text-foreground/50">
        上传照片或描述，AI 相似度匹配备案宠物
      </div>
    </main>
  );
}
