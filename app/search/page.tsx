import Link from "next/link";

import SearchForm from "@/components/search/SearchForm";

export const metadata = {
  title: "智能搜索 · Pet Center",
};

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
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
            发布宠物信息
          </Link>
        </nav>

        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">智能搜索</h1>
          <p className="text-sm text-foreground/60">
            上传照片 + 文字描述 → 属性筛选 + AI 相似度排序 → 自动匹配最相似的备案宠物。
            图搜图、文搜图与图文融合三种模式，按匹配分数降序展示。
          </p>
        </header>

        <SearchForm />
      </div>
    </main>
  );
}
