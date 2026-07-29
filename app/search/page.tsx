import SearchForm from "@/components/search/SearchForm";

export const metadata = {
  title: "智能搜索 · Pet Center",
};

export default function SearchPage() {
  return (
    <main className="flex-1 bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
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
