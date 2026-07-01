import type { Metadata } from "next";
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
