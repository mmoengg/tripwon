import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tripwon",
  description: "여행 지출을 원화로 한눈에",
  applicationName: "tripwon",
  // iOS 홈 화면에 추가했을 때: 주소창 없이 열리고, 아이콘 아래 이름은 tripwon
  // (아이콘은 src/app/apple-icon.png 파일이 자동으로 연결됨)
  appleWebApp: { capable: true, title: "tripwon", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff", // 상단 상태바·브라우저 UI 색
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
