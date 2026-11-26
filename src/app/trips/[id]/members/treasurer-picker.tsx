"use client";

import { useState, useTransition } from "react";

// 공금 총무 고르기 (만든 사람만 보임)
export function TreasurerPicker({
  members,
  current,
  action,
}: {
  members: { user_id: string; display_name: string }[];
  current: string | null;
  action: (userId: string | null) => Promise<{ error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const pick = (uid: string | null) =>
    startTransition(async () => {
      setError("");
      const r = await action(uid);
      if (r.error) setError(r.error);
    });
  return (
    <section className="flex flex-col gap-3 rounded-[14px] bg-card p-4">
      <div>
        <p className="text-sm font-medium">공금 총무</p>
        <p className="text-xs text-muted">
          회비를 걷어 같이 쓰면 공금 현금을 들고 있을 사람을 정해주세요. 총무가 돈을 더 받거나 내는 건 아니에요. 외화 공금은 총무 계정으로 충전·환전을 적어주세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="공금 총무">
        <button
          type="button"
          role="radio"
          aria-checked={current === null}
          disabled={pending}
          onClick={() => pick(null)}
          className={`h-10 rounded-full px-4 text-sm ${current === null ? "bg-ink font-medium text-white" : "border border-field-line bg-field text-muted"}`}
        >
          공금 안 씀
        </button>
        {members.map((m) => (
          <button
            key={m.user_id}
            type="button"
            role="radio"
            aria-checked={current === m.user_id}
            disabled={pending}
            onClick={() => pick(m.user_id)}
            className={`h-10 rounded-full px-4 text-sm ${current === m.user_id ? "bg-ink font-medium text-white" : "border border-field-line bg-field text-ink"}`}
          >
            {m.display_name}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
