"use client";

import { useActionState, useState } from "react";
import type { ExchangeFormState, ExchangeFormValues } from "../../../exchange-actions";
import { formatRate } from "@/lib/format";
import { AmountInput } from "@/components/amount-input";

// bg-card: 바탕(paper) 위에서 입력 칸이 보이게 / min-w-0: iOS에서 날짜·숫자 칸이 최소 너비 때문에 겹치는 것 방지 / text-base(16px): iOS 자동 확대 방지
const field = "h-12 w-full min-w-0 rounded-xl border border-line bg-card px-4 text-base outline-none focus:border-accent";
const label = "text-sm font-medium text-ink";
const toNum = (s: string) => Number(s.replaceAll(",", "").trim());

type Props = {
  // 서버 페이지에서 tripId를 bind해서 넘겨줌
  action: (prev: ExchangeFormState, formData: FormData) => Promise<ExchangeFormState>;
  currency: string;
  today: string;
  // 있으면 수정 모드
  initial?: ExchangeFormValues;
};

export function ExchangeForm({ action, currency, today, initial }: Props) {
  const isEdit = !!initial;
  const [state, formAction, pending] = useActionState<ExchangeFormState, FormData>(action, {});
  const v = state.values ?? initial;
  const [kind, setKind] = useState(v?.kind ?? "prepaid");
  // 환율 미리보기용으로만 상태에 담음 (입력 칸 자체는 비제어)
  const [krw, setKrw] = useState(v?.krw_amount ?? "");
  const [foreign, setForeign] = useState(v?.foreign_amount ?? "");
  const rate = toNum(krw) / toNum(foreign);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="kind" value={kind} />

      <div className="grid h-12 grid-cols-2 gap-1 rounded-xl bg-line-soft p-1" role="radiogroup">
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
            className={`rounded-lg text-sm font-medium ${kind === o.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="krw_amount" className={label}>낸 원화</label>
        <div className="flex items-center gap-2">
          <AmountInput
            id="krw_amount" name="krw_amount" required autoFocus={!isEdit}
            defaultValue={v?.krw_amount} onValueChange={setKrw}
            placeholder="100,000" className={`${field} text-right tabular-nums`}
          />
          <span className="w-10 shrink-0 text-sm text-muted">원</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="foreign_amount" className={label}>받은 {currency}</label>
        <div className="flex items-center gap-2">
          <AmountInput
            id="foreign_amount" name="foreign_amount" required decimals={2}
            defaultValue={v?.foreign_amount} onValueChange={setForeign}
            placeholder="0" className={`${field} text-right tabular-nums`}
          />
          <span className="w-10 shrink-0 text-sm text-muted">{currency}</span>
        </div>
        <p className="text-xs text-muted tabular-nums">
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

      <button disabled={pending} className="h-12 rounded-xl bg-accent font-semibold text-white disabled:opacity-50">
        {pending ? "저장 중…" : isEdit ? "수정 저장" : "저장"}
      </button>
    </form>
  );
}
