import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const maru = Zen_Maru_Gothic({ weight: ["400", "500", "700"], variable: "--font-maru", preload: false });

export const metadata: Metadata = {
  title: "就活管理",
  description: "就職活動の企業情報・選考記録・日程を一元管理",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${maru.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
