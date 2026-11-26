"use client";

import { useState, useTransition } from "react";
import { AmountInput } from "@/components/amount-input";

// 공금 입금 기록: 누가 얼마를 공금에 냈는지
export function DepositForm({
  members,
  defaultFrom,
  action,
}: {
  members: { user_id: string; display_name: string }[];
  defaultFrom: string;
  action: (fromUser: string, amount: number) => Promise<{ error?: string }>;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [amount, setAmount] = useState("");
  const [key, setKey] = useState(0); // 저장 후 금액 칸 비우기
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="입금한 사람">
        {members.map((m) => (
          <button
            key={m.user_id}
            type="button"
            role="radio"
            aria-checked={from === m.user_id}
            onClick={() => setFrom(m.user_id)}
            className={`h-9 rounded-full px-3.5 text-sm ${from === m.user_id ? "bg-ink font-medium text-white" : "border border-field-line bg-field text-ink"}`}
          >
            {m.display_name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <AmountInput
          key={key}
          aria-label="입금 금액"
          placeholder="50,000"
          onValueChange={setAmount}
          className="h-11 min-w-0 flex-1 rounded-xl border border-field-line bg-field px-4 text-right text-base tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <span className="flex h-11 items-center text-sm text-muted">원</span>
        <button
          type="button"
          disabled={pending || !from || !amount}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const r = await action(from, Number(amount.replaceAll(",", "")));
              if (r.error) setError(r.error);
              else {
                setAmount("");
                setKey((k) => k + 1);
              }
            })
          }
          className="h-11 shrink-0 rounded-xl bg-stamp px-4 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {pending ? "…" : "입금 기록"}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
