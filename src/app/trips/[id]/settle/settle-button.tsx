"use client";

import { useState, useTransition } from "react";

// 송금 완료 / 취소 버튼 (서버 페이지에서 인자를 bind해서 넘겨줌)
export function SettleButton({
  action,
  label,
  variant = "primary",
}: {
  action: () => Promise<{ error?: string }>;
  label: string;
  variant?: "primary" | "ghost";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const r = await action();
            if (r.error) setError(r.error);
          })
        }
        className={
          variant === "primary"
            ? "h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50"
            : "h-9 px-2 text-xs text-muted underline disabled:opacity-50"
        }
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="mt-1 max-w-48 text-right text-[11px] text-red-700">{error}</span>}
    </span>
  );
}
