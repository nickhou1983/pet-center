import Link from "next/link";

const navItems = [
  { href: "/search", label: "智能搜索" },
  { href: "/publish", label: "发布信息" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          🐾 Pet Center
        </Link>
        <nav aria-label="主导航" className="flex items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 font-medium text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground sm:px-4"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
