"use client";

import { useState, useTransition } from "react";

// 멤버 줄 오른쪽의 작은 내보내기 버튼 (한 번 더 눌러야 실행)
export function RemoveMemberButton({ name, action }: { name: string; action: () => Promise<{ error?: string }> }) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="h-11 px-2 text-sm text-muted underline">
        내보내기
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setArmed(false)} className="h-11 px-2 text-sm text-muted">
        취소
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label={`${name} 내보내기`}
        onClick={() => startTransition(async () => void (await action()))}
        className="h-9 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "…" : "내보내기"}
      </button>
    </div>
  );
}
