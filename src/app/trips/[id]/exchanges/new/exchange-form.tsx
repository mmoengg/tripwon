"use client";

import { useActionState, useState } from "react";
import type { ExchangeFormState } from "../../../exchange-actions";
import { formatRate } from "@/lib/format";

const field = "h-12 w-full rounded-xl border border-neutral-200 px-4 outline-none focus:border-neutral-400";
const label = "text-sm font-medium text-neutral-700";
const toNum = (s: string) => Number(s.replaceAll(",", "").trim());

type Props = {
  // 서버 페이지에서 tripId를 bind해서 넘겨줌
  action: (prev: ExchangeFormState, formData: FormData) => Promise<ExchangeFormState>;
  currency: string;
  today: string;
};

export function ExchangeForm({ action, currency, today }: Props) {
  const [state, formAction, pending] = useActionState<ExchangeFormState, FormData>(action, {});
  const v = state.values;
  const [kind, setKind] = useState(v?.kind ?? "prepaid");
  // 환율 미리보기용으로만 상태에 담음 (입력 칸 자체는 비제어)
  const [krw, setKrw] = useState(v?.krw_amount ?? "");
  const [foreign, setForeign] = useState(v?.foreign_amount ?? "");
  const rate = toNum(krw) / toNum(foreign);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="kind" value={kind} />

      <div className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1" role="radiogroup">
        {[
          { value: "prepaid", label: "충전카드 충전" },
          { value: "cash", label: "현금 환전" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={kind === o.value}
            onClick={() => setKind(o.value)}
            className={`rounded-lg text-sm font-medium ${kind === o.value ? "bg-white shadow-sm" : "text-neutral-500"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="krw_amount" className={label}>낸 원화</label>
        <div className="flex items-center gap-2">
          <input
            id="krw_amount" name="krw_amount" required inputMode="numeric" autoFocus
            defaultValue={v?.krw_amount} onInput={(e) => setKrw(e.currentTarget.value)}
            placeholder="100,000" className={`${field} text-right tabular-nums`}
          />
          <span className="w-10 shrink-0 text-sm text-neutral-500">원</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="foreign_amount" className={label}>받은 {currency}</label>
        <div className="flex items-center gap-2">
          <input
            id="foreign_amount" name="foreign_amount" required inputMode="decimal"
            defaultValue={v?.foreign_amount} onInput={(e) => setForeign(e.currentTarget.value)}
            placeholder="0" className={`${field} text-right tabular-nums`}
          />
          <span className="w-10 shrink-0 text-sm text-neutral-500">{currency}</span>
        </div>
        <p className="text-xs text-neutral-400 tabular-nums">
          {Number.isFinite(rate) && rate > 0
            ? `적용 환율 1 ${currency} = ${formatRate(rate)}원`
            : "두 금액을 넣으면 환율이 계산돼요."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="exchanged_on" className={label}>날짜</label>
        <input id="exchanged_on" name="exchanged_on" type="date" required defaultValue={v?.exchanged_on ?? today} className={field} />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" aria-live="polite">{state.error}</p>
      )}

      <button disabled={pending} className="h-12 rounded-xl bg-neutral-900 font-medium text-white disabled:opacity-50">
        {pending ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
