import type { Metadata, Viewport } from "next";
// 폰트는 npm 패키지로 직접 포함 (CDN 링크 없이 우리 서버에서 제공)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"; // 본문
import "@fontsource/nanum-myeongjo/700.css"; // 제목·큰 금액 (font-serif)
import "@fontsource/nanum-myeongjo/800.css";
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
  themeColor: "#F3EEE4", // 상단 상태바·브라우저 UI 색 (= 바탕 paper)
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
