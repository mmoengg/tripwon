"use client";

import { useState, useTransition } from "react";

export function JoinButton({ action }: { action: () => Promise<{ error?: string }> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await action(); // 성공하면 서버에서 여행 화면으로 이동
            if (r?.error) setError(r.error);
          })
        }
        className="h-12 rounded-xl bg-accent font-semibold text-white disabled:opacity-50"
      >
        {pending ? "참여하는 중…" : "참여하기"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
