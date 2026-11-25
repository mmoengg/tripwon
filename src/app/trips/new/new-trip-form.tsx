"use client";

import { useActionState, useState } from "react";
import { createTrip, type TripFormState } from "../actions";
import { CURRENCIES } from "@/lib/currencies";

const field = "h-12 w-full rounded-xl border border-neutral-200 px-4 outline-none focus:border-neutral-400";
const label = "text-sm font-medium text-neutral-700";

export function NewTripForm() {
  const [state, formAction, pending] = useActionState<TripFormState, FormData>(createTrip, {});
  const v = state.values;
  // select는 비제어(defaultValue)로 두고, "1 JPY =" 표시용으로만 상태를 따로 둠
  const [currency, setCurrency] = useState<string>(v?.currency ?? CURRENCIES[0].code);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={label}>여행 이름</label>
        <input id="name" name="name" required maxLength={50} defaultValue={v?.name} placeholder="오사카 3박 4일" className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="currency" className={label}>현지 통화</label>
        <select
          id="currency"
          name="currency"
          defaultValue={v?.currency ?? CURRENCIES[0].code}
          onChange={(e) => setCurrency(e.target.value)}
          className={`${field} bg-white`}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rate_krw" className={label}>환율</label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-neutral-500">1 {currency} =</span>
          <input
            id="rate_krw"
            name="rate_krw"
            required
            inputMode="decimal"
            defaultValue={v?.rate_krw}
            placeholder="0.00"
            className={`${field} text-right`}
          />
          <span className="shrink-0 text-sm text-neutral-500">원</span>
        </div>
        <p className="text-xs text-neutral-400">
          {currency === "JPY" || currency === "VND"
            ? `100 ${currency}가 아니라 1 ${currency} 기준이에요.`
            : "나중에 언제든 바꿀 수 있어요."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="start_date" className={label}>시작일</label>
          <input id="start_date" name="start_date" type="date" defaultValue={v?.start_date} className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="end_date" className={label}>종료일</label>
          <input id="end_date" name="end_date" type="date" defaultValue={v?.end_date} className={field} />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" aria-live="polite">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="h-12 rounded-xl bg-neutral-900 font-medium text-white disabled:opacity-50"
      >
        {pending ? "저장 중…" : "여행 만들기"}
      </button>
    </form>
  );
}
