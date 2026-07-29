import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pet Center · 宠物信息平台",
  description:
    "综合宠物信息平台：备案登记 + 走失找回 + 领养，支持照片与文字的 AI 相似度匹配。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <SiteHeader />
        {children}
        <footer className="border-t border-foreground/10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Pet Center · 宠物信息平台</span>
            <span>MIT</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
