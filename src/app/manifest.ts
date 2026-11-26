import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때의 앱 정보 (안드로이드 '앱 설치', iOS '홈 화면에 추가')
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tripwon · 여행 경비",
    short_name: "tripwon",
    description: "여행 지출을 원화로 한눈에",
    start_url: "/",
    scope: "/",
    display: "standalone", // 주소창 없이 앱처럼
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 안드로이드가 원·물방울 등 모양으로 잘라도 글자가 안 잘리게 (글자는 가운데 80% 안)
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
