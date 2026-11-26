"use client";

import { useActionState, useState } from "react";
import type { ExpenseFormState, ExpenseFormValues } from "../../../expense-actions";
import { BOOKING_CATEGORIES, LOCAL_CATEGORIES } from "@/lib/categories";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { AmountInput } from "@/components/amount-input";

const field = "h-12 w-full rounded-xl border border-neutral-200 px-4 outline-none focus:border-neutral-400";
const label = "text-sm font-medium text-neutral-700";

type Props = {
  // 서버 페이지에서 id를 bind해서 넘겨줌 (createExpense 또는 updateExpense)
  action: (prev: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  tripCurrency: string;
  today: string;
  // 있으면 수정 모드: 원래 값을 채우고 버튼 문구가 바뀜
  initial?: ExpenseFormValues;
};

export function ExpenseForm({ action, tripCurrency, today, initial }: Props) {
  const isEdit = !!initial;
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(action, {});
  // 에러로 돌아온 값 > 수정할 원래 값 > 빈 값
  const v = state.values ?? initial;

  // 결제 장소/통화/수단은 서로 연동되는 토글이라 상태로 관리하고 hidden input으로 전송
  const [paidWhere, setPaidWhere] = useState(v?.paid_where ?? "local");
  const [currency, setCurrency] = useState(v?.currency ?? tripCurrency);
  const [method, setMethod] = useState(v?.method ?? "prepaid");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="paid_where" value={paidWhere} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="method" value={method} />

      <div className="flex flex-col gap-2">
        <span className={label}>어디서 결제했나요?</span>
        <Segmented
          value={paidWhere}
          options={[
            { value: "local", label: "현지에서" },
            { value: "korea", label: "한국에서 미리" },
          ]}
          onChange={(w) => {
            setPaidWhere(w);
            // 한국에서 미리 낸 건 보통 원화 → 기본값만 맞춰주고, 바꿀 수는 있게
            setCurrency(w === "korea" ? "KRW" : tripCurrency);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className={label}>금액</label>
        <div className="flex gap-2">
          <AmountInput
            id="amount"
            name="amount"
            required
            decimals={currency === "KRW" ? 0 : 2}
            autoFocus={!isEdit}
            defaultValue={v?.amount}
            placeholder="0"
            className={`${field} text-right text-lg tabular-nums`}
          />
          <Segmented
            value={currency}
            options={[
              { value: tripCurrency, label: tripCurrency },
              { value: "KRW", label: "KRW" },
            ]}
            onChange={setCurrency}
            className="w-36 shrink-0"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={label}>내용</label>
        <input id="title" name="title" required maxLength={60} defaultValue={v?.title} placeholder="이치란 라멘" className={field} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>카테고리</legend>
        <CategoryChips items={LOCAL_CATEGORIES} defaultValue={v?.category ?? "food"} />
        <p className="mt-1 text-xs text-neutral-400">예약·결제</p>
        <CategoryChips items={BOOKING_CATEGORIES} defaultValue={v?.category ?? "food"} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className={label}>결제 수단</span>
        <Segmented
          value={method}
          options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
          onChange={setMethod}
        />
        <p className="text-xs text-neutral-400">
          {PAYMENT_METHODS.find((m) => m.value === method)?.hint}
        </p>
      </div>

      {method === "credit" && currency !== "KRW" && (
        <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-4">
          <label htmlFor="amount_krw_actual" className={label}>
            명세서 실제 금액 <span className="font-normal text-neutral-400">(선택)</span>
          </label>
          <div className="flex items-center gap-2">
            <AmountInput
              id="amount_krw_actual"
              name="amount_krw_actual"
              defaultValue={v?.amount_krw_actual}
              placeholder="카드사 청구 원화"
              className={`${field} bg-white text-right tabular-nums`}
            />
            <span className="shrink-0 text-sm text-neutral-500">원</span>
          </div>
          <p className="text-xs text-neutral-400">비워두면 여행 기본 환율로 예상 금액을 계산해요.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="spent_on" className={label}>날짜</label>
          <input id="spent_on" name="spent_on" type="date" required defaultValue={v?.spent_on ?? today} className={field} />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" aria-live="polite">{state.error}</p>
      )}

      <button disabled={pending} className="h-12 rounded-xl bg-neutral-900 font-medium text-white disabled:opacity-50">
        {pending ? "저장 중…" : isEdit ? "수정 저장" : "저장"}
      </button>
    </form>
  );
}

// 라디오(비제어) 칩: 폼 초기화 시 defaultChecked로 돌아감
function CategoryChips({
  items,
  defaultValue,
}: {
  items: readonly { value: string; label: string; emoji: string }[];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <label key={c.value} className="cursor-pointer">
          <input
            type="radio"
            name="category"
            value={c.value}
            defaultChecked={c.value === defaultValue}
            className="peer sr-only"
          />
          <span className="flex h-9 items-center gap-1 rounded-full border border-neutral-200 px-3 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-400">
            <span aria-hidden>{c.emoji}</span>
            {c.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`grid h-12 grid-flow-col auto-cols-fr gap-1 rounded-xl bg-neutral-100 p-1 ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg text-sm font-medium ${
            value === o.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
