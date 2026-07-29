import PublishForm from "@/components/publish/PublishForm";

export const metadata = {
  title: "发布宠物信息 · Pet Center",
};

export default function PublishPage() {
  return (
    <main className="flex-1 bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">发布宠物信息</h1>
          <p className="text-sm text-foreground/60">
            登记备案 · 发布走失 / 捡到 · 发布领养。提交后将自动为首图生成 AI 向量，供后续搜索匹配。
          </p>
        </header>

        <PublishForm />
      </div>
    </main>
  );
}
