"use client";

import { useState, useTransition } from "react";

type Props = {
  label: string; // 첫 버튼 문구: "이 지출 삭제"
  message: string; // 확인 문구
  // 서버 페이지에서 id를 bind해서 넘겨줌. 성공하면 서버에서 redirect
  action: () => Promise<{ error?: string } | void>;
};

// 브라우저 confirm() 대신 두 번 눌러서 삭제 (모바일에서도 자연스럽게)
export function ConfirmDeleteButton({ label, message, action }: Props) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="h-12 text-sm text-red-600">
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="h-11 rounded-lg bg-white text-sm font-medium"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await action();
              if (r?.error) setError(r.error);
            })
          }
          className="h-11 rounded-lg bg-red-600 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "삭제 중…" : "삭제"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
