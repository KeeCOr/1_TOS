import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "검사의 승천 — Swordmaster's Ascent",
  description: "로그라이트 예측형 턴제 전투 게임",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
