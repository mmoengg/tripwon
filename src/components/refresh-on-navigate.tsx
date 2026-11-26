"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Next 16(cacheComponents)은 한 번 연 화면을 <Activity>로 숨겨뒀다가 그대로 다시 보여줌
// → 다른 화면에서 데이터를 바꿨으면 예전 내용이 보일 수 있음.
// 여행 화면 사이를 이동할 때마다 지금 화면 데이터를 서버에서 다시 받아옴
export function RefreshOnNavigate() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [pathname, router]);
  return null;
}
