"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fetchDefaultRate, type TripFormState, type TripFormValues } from "../actions";
import { CURRENCIES } from "@/lib/currencies";
import { AmountInput, formatAmountInput } from "@/components/amount-input";

const field = "h-12 w-full rounded-xl border border-neutral-200 px-4 outline-none focus:border-neutral-400";
const label = "text-sm font-medium text-neutral-700";

type Props = {
  // 서버 페이지에서 넘겨줌 (createTrip 또는 updateTrip.bind(null, id))
  action: (prev: TripFormState, formData: FormData) => Promise<TripFormState>;
  // 있으면 수정 모드: 원래 값을 채우고, 통화는 바꿀 수 없음
  initial?: TripFormValues;
};

export function TripForm({ action, initial }: Props) {
  const isEdit = !!initial;
  const [state, formAction, pending] = useActionState<TripFormState, FormData>(action, {});
  // 에러로 돌아온 값 > 원래 값 > 빈 값
  const v = state.values ?? initial;
  // select는 비제어(defaultValue)로 두고, "1 JPY =" 표시용으로만 상태를 따로 둠
  const [currency, setCurrency] = useState<string>(v?.currency ?? CURRENCIES[0].code);

  // 환율 칸은 비제어로 두고 ref로 값만 채움 (폼 초기화와 충돌하지 않게)
  const rateRef = useRef<HTMLInputElement>(null);
  // 사용자가 직접 고친 뒤에는 자동으로 덮어쓰지 않음. 에러로 돌아온 경우도 사용자 값 유지
  const rateTouched = useRef(!!v?.rate_krw);
  const [rateInfo, setRateInfo] = useState<
    { status: "loading" } | { status: "ok"; updatedAt: string } | { status: "fail" } | null
  >(null);

  useEffect(() => {
    if (rateTouched.current) return;
    let cancelled = false;
    setRateInfo({ status: "loading" });
    fetchDefaultRate(currency).then((r) => {
      if (cancelled || rateTouched.current) return;
      if (!r) return setRateInfo({ status: "fail" });
      // 1 미만(VND 등)은 소수 4자리, 나머지는 2자리 — DB는 numeric(12,4)
      if (rateRef.current) rateRef.current.value = formatAmountInput(r.rate.toFixed(r.rate < 1 ? 4 : 2), 4);
      setRateInfo({ status: "ok", updatedAt: r.updatedAt });
    });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={label}>여행 이름</label>
        <input id="name" name="name" required maxLength={50} defaultValue={v?.name} placeholder="오사카 3박 4일" className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="currency" className={label}>현지 통화</label>
        {/* 수정 모드에선 select가 disabled라 값이 전송되지 않으므로 hidden으로 보냄 (서버는 무시함) */}
        {isEdit && <input type="hidden" name="currency" value={currency} />}
        <select
          disabled={isEdit}
          id="currency"
          name="currency"
          defaultValue={v?.currency ?? CURRENCIES[0].code}
          onChange={(e) => {
            // 통화가 바뀌면 이전 통화 기준 환율은 의미 없음 → 새 기본값으로 다시 채움
            rateTouched.current = false;
            setCurrency(e.target.value);
          }}
          className={`${field} bg-white disabled:bg-neutral-50 disabled:text-neutral-500`}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
        {isEdit && (
          <p className="text-xs text-neutral-400">이미 적은 지출·환전 금액이 꼬이지 않게 통화는 바꿀 수 없어요.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="rate_krw" className={label}>환율</label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-neutral-500">1 {currency} =</span>
          <AmountInput
            id="rate_krw"
            name="rate_krw"
            required
            ref={rateRef}
            decimals={4}
            defaultValue={v?.rate_krw}
            onInput={() => {
              rateTouched.current = true;
              setRateInfo(null);
            }}
            placeholder="0.00"
            className={`${field} text-right`}
          />
          <span className="shrink-0 text-sm text-neutral-500">원</span>
        </div>
        <p className="text-xs text-neutral-400">
          {rateInfo?.status === "loading" && "오늘 환율 불러오는 중…"}
          {rateInfo?.status === "ok" && (
            <>
              {rateInfo.updatedAt} 기준 환율이에요. 직접 고쳐도 돼요.{" "}
              <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">
                Rates By Exchange Rate API
              </a>
            </>
          )}
          {rateInfo?.status === "fail" && "환율을 불러오지 못했어요. 직접 입력해주세요."}
          {rateInfo === null &&
            (isEdit
              ? "신용카드 예상 금액과, 환전 기록이 없을 때의 지출 금액이 이 환율로 다시 계산돼요."
              : "나중에 언제든 바꿀 수 있어요.")}
          {(currency === "JPY" || currency === "VND") && (
            <span className="block">100 {currency}가 아니라 1 {currency} 기준이에요.</span>
          )}
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
        {pending ? "저장 중…" : isEdit ? "수정 저장" : "여행 만들기"}
      </button>
    </form>
  );
}
