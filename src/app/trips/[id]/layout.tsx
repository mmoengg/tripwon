import { Suspense } from "react";
import { RefreshOnNavigate } from "@/components/refresh-on-navigate";

// 여행 하위 화면(상세·지출·충전·요약·정산·멤버)을 묶는 레이아웃.
// · revalidatePath("/trips/[id]", "layout")로 이 아래를 한 번에 갱신하는 기준점
// · 화면을 옮길 때마다 최신 데이터로 다시 그림 (숨겨뒀던 예전 화면 방지)
export default function TripLayout({ children }: LayoutProps<"/trips/[id]">) {
  return (
    <>
      {/* usePathname은 요청마다 달라서 Suspense 안에 (cacheComponents 빌드 조건) */}
      <Suspense fallback={null}>
        <RefreshOnNavigate />
      </Suspense>
      {children}
    </>
  );
}
