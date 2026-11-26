"use client";

import { useState, useTransition } from "react";

type PoolMode = "off" | "separate" | "settle";

const MODES: { value: PoolMode; label: string; hint: string }[] = [
  { value: "off", label: "안 씀", hint: "공금 없이 각자 낸 돈만 정산해요." },
  {
    value: "separate",
    label: "따로 관리",
    hint: "곗돈처럼 이미 모아둔 돈이에요. 넣은 돈과 남은 돈만 보여주고, 공금 지출은 정산에 안 들어가요.",
  },
  {
    value: "settle",
    label: "회비로 정산",
    hint: "여행 중에 회비를 걷어요. 누가 얼마 냈는지 기록하고, 남거나 모자란 공금까지 정산해요.",
  },
];

// 공금 설정: 방식 + 총무 (만든 사람만 보임)
export function PoolSettings({
  members,
  mode,
  treasurer,
  setMode,
  setTreasurer,
}: {
  members: { user_id: string; display_name: string }[];
  mode: PoolMode;
  treasurer: string | null;
  setMode: (mode: string) => Promise<{ error?: string }>;
  setTreasurer: (userId: string | null) => Promise<{ error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError("");
      const r = await fn();
      if (r.error) setError(r.error);
    });
  const chip = (on: boolean) =>
    `h-10 rounded-full px-4 text-sm ${on ? "bg-ink font-medium text-white" : "border border-field-line bg-field text-ink"}`;

  return (
    <section className="flex flex-col gap-4 rounded-[14px] bg-card p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">공금</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-line p-1" role="radiogroup" aria-label="공금 방식">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              disabled={pending}
              onClick={() => mode !== m.value && run(() => setMode(m.value))}
              className={`h-10 rounded-lg text-sm font-medium ${mode === m.value ? "bg-field text-ink shadow-sm" : "text-muted"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{MODES.find((m) => m.value === mode)?.hint}</p>
      </div>

      {mode !== "off" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">총무 {mode === "separate" && <span className="font-normal text-muted">(선택)</span>}</p>
          <p className="text-xs text-muted">
            공금을 들고 있는 사람이에요. 총무가 돈을 더 받거나 내는 건 아니에요.
            {mode === "settle"
              ? " 외화 공금은 총무 계정으로 충전·환전을 적어주세요."
              : " 총무도 공금을 넣거나 지울 수 있어요."}
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="공금 총무">
            <button
              type="button"
              role="radio"
              aria-checked={treasurer === null}
              disabled={pending}
              onClick={() => run(() => setTreasurer(null))}
              className={chip(treasurer === null)}
            >
              정하지 않음
            </button>
            {members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                role="radio"
                aria-checked={treasurer === m.user_id}
                disabled={pending}
                onClick={() => run(() => setTreasurer(m.user_id))}
                className={chip(treasurer === m.user_id)}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
