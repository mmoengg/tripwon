"use client";

import { useState, useTransition } from "react";
import { AmountInput } from "@/components/amount-input";

const field =
  "h-11 w-full min-w-0 rounded-xl border border-field-line bg-field px-4 text-base tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

// '따로 관리' 공금에 돈 넣기: 원화 또는 여행 통화(외화)
export function PoolFundForm({
  tripCurrency,
  action,
}: {
  tripCurrency: string;
  action: (input: { currency: string; amount: number; krwAmount: number | null; memo: string }) => Promise<{ error?: string }>;
}) {
  const foreign = tripCurrency !== "KRW";
  const [currency, setCurrency] = useState(foreign ? tripCurrency : "KRW");
  const [amount, setAmount] = useState("");
  const [krw, setKrw] = useState("");
  const [memo, setMemo] = useState("");
  const [key, setKey] = useState(0); // 저장 후 칸 비우기
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isForeign = currency !== "KRW";
  const num = (s: string) => Number(s.replaceAll(",", ""));

  return (
    <div className="flex flex-col gap-2" key={key}>
      {foreign && (
        <div className="grid h-10 grid-cols-2 gap-1 rounded-xl bg-line p-1" role="radiogroup" aria-label="공금 통화">
          {[tripCurrency, "KRW"].map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currency === c}
              onClick={() => setCurrency(c)}
              className={`rounded-lg text-sm font-medium ${currency === c ? "bg-field text-ink shadow-sm" : "text-muted"}`}
            >
              {c === "KRW" ? "원화" : `외화 (${c})`}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <AmountInput
          aria-label="넣은 금액"
          decimals={isForeign ? 2 : 0}
          placeholder={isForeign ? "50,000" : "800,000"}
          onValueChange={setAmount}
          className={`${field} flex-1 text-right`}
        />
        <span className="w-10 shrink-0 text-sm text-muted">{isForeign ? currency : "원"}</span>
      </div>
      {isForeign && (
        <div className="flex items-center gap-2">
          <AmountInput
            aria-label="바꾸는 데 든 원화 (선택)"
            placeholder="바꾸는 데 든 원화 (선택)"
            onValueChange={setKrw}
            className={`${field} flex-1 text-right`}
          />
          <span className="w-10 shrink-0 text-sm text-muted">원</span>
        </div>
      )}
      <div className="flex gap-2">
        <input
          aria-label="메모"
          maxLength={50}
          placeholder="메모 (예: 곗돈)"
          onChange={(e) => setMemo(e.target.value)}
          className={`${field} flex-1`}
        />
        <button
          type="button"
          disabled={pending || !amount}
          onClick={() =>
            startTransition(async () => {
              setError("");
              const r = await action({ currency, amount: num(amount), krwAmount: isForeign && krw ? num(krw) : null, memo });
              if (r.error) setError(r.error);
              else {
                setAmount("");
                setKrw("");
                setMemo("");
                setKey((k) => k + 1);
              }
            })
          }
          className="h-11 shrink-0 rounded-xl bg-stamp px-4 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {pending ? "…" : "공금 넣기"}
        </button>
      </div>
      {isForeign && (
        <p className="text-xs text-muted">원화를 적으면 그 환율로, 비우면 여행 기본 환율로 공금 지출을 원화로 바꿔요.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
