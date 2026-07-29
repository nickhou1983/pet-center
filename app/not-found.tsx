import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-md rounded-3xl border border-foreground/10 bg-background p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground/50">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">没有找到这个页面</h1>
        <p className="mt-4 text-sm leading-6 text-foreground/60">
          这条宠物信息可能已删除，或链接地址有误。你可以返回首页重新搜索或发布信息。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          返回首页
        </Link>
      </section>
    </main>
  );
}
