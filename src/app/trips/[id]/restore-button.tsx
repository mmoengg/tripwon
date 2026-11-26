"use client";

import { useState, useTransition } from "react";

// 삭제된 지출 되살리기 (서버 페이지에서 id를 bind해서 넘겨줌)
export function RestoreButton({ action }: { action: () => Promise<{ error?: string }> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await action();
            if (r.error) setError(r.error);
          })
        }
        className="h-9 rounded-lg border border-field-line bg-field px-3 text-xs font-semibold text-ink disabled:opacity-50"
      >
        {pending ? "…" : "되살리기"}
      </button>
      {error && <span className="mt-1 text-[11px] text-red-700">{error}</span>}
    </span>
  );
}
