"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

// Next 16(cacheComponents)은 페이지를 떠나도 지우지 않고 <Activity>로 숨겨둠
// → 입력값·에러·useActionState가 그대로 남음. 폼 화면은 떠날 때 key를 바꿔 통째로 새로 만듦
// (숨겨질 때 layout effect cleanup이 실행되는 걸 이용. 공식 문서 'Preserving UI state' 참고)
export function ResetOnLeave({ children }: { children: ReactNode }) {
  const [key, setKey] = useState(0);
  useLayoutEffect(() => () => setKey((k) => k + 1), []);
  return <div key={key} className="contents">{children}</div>;
}
