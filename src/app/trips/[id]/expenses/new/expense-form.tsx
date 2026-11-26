"use client";

import { useActionState, useState } from "react";
import type { ExpenseFormState, ExpenseFormValues } from "../../../expense-actions";
import { BOOKING_CATEGORIES, LOCAL_CATEGORIES } from "@/lib/categories";
import { DOMESTIC_METHODS, PAYMENT_METHODS } from "@/lib/payment-methods";
import { AmountInput } from "@/components/amount-input";

// bg-field(순백)·border-field-line: 바탕(paper) 위에서 입력 칸이 확실히 보이게 / min-w-0: iOS에서 날짜·숫자 칸이 최소 너비 때문에 겹치는 것 방지 / text-base(16px): iOS 자동 확대 방지
const field = "h-12 w-full min-w-0 rounded-xl border border-field-line bg-field px-4 text-base text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20";
const label = "text-sm font-medium text-ink";

type Props = {
  // 서버 페이지에서 id를 bind해서 넘겨줌 (createExpense 또는 updateExpense)
  action: (prev: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  tripCurrency: string;
  today: string;
  // 있으면 수정 모드: 원래 값을 채우고 버튼 문구가 바뀜
  initial?: ExpenseFormValues;
  // 낸 사람 후보 (멤버). 2명 이상일 때만 고르는 칸이 보임
  members?: { user_id: string; display_name: string }[];
  me?: string | null;
};

export function ExpenseForm({ action, tripCurrency, today, initial, members = [], me = null }: Props) {
  const isEdit = !!initial;
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(action, {});
  // 에러로 돌아온 값 > 수정할 원래 값 > 빈 값
  const v = state.values ?? initial;

  // 결제 장소/통화/수단은 서로 연동되는 토글이라 상태로 관리하고 hidden input으로 전송
  const [paidWhere, setPaidWhere] = useState(v?.paid_where ?? "local");
  const [currency, setCurrency] = useState(v?.currency ?? tripCurrency);
  // 국내 여행(KRW): 결제 장소·통화 선택이 필요 없고, 환전 설명도 숨김
  const domestic = tripCurrency === "KRW";
  // 국내는 카드(credit)/현금 두 가지. 예전에 충전카드로 적은 국내 지출은 '카드'로 보여줌
  const [method, setMethod] = useState(
    domestic ? (v?.method === "cash" ? "cash" : "credit") : (v?.method ?? "prepaid"),
  );
  const [paidBy, setPaidBy] = useState(v?.paid_by || me || "");
  // 나눌 사람 (정산). 기본은 멤버 전원
  const [splitWith, setSplitWith] = useState<string[]>(() => {
    const saved = (v?.split_with ?? "").split(",").filter(Boolean);
    return saved.length ? saved : members.map((m) => m.user_id);
  });
  const toggleSplit = (uid: string) =>
    setSplitWith((cur) => (cur.includes(uid) ? (cur.length > 1 ? cur.filter((x) => x !== uid) : cur) : [...cur, uid]));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="paid_where" value={paidWhere} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="paid_by" value={paidBy} />
      {members.length > 1 && <input type="hidden" name="split_with" value={splitWith.join(",")} />}

      {members.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className={label}>누가 냈나요?</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="낸 사람">
            {members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                role="radio"
                aria-checked={paidBy === m.user_id}
                onClick={() => setPaidBy(m.user_id)}
                className={`h-10 rounded-full px-4 text-sm ${
                  paidBy === m.user_id ? "bg-ink font-medium text-white" : "border border-field-line bg-field text-ink"
                }`}
              >
                {m.display_name}
                {m.user_id === me && " (나)"}
              </button>
            ))}
          </div>
          {!domestic && <p className="text-xs text-muted">충전카드·현금이면 낸 사람의 지갑 평균 환율로 계산해요.</p>}
        </div>
      )}

      {members.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className={label}>누구랑 나눴나요?</span>
            <button
              type="button"
              onClick={() => setSplitWith(members.map((m) => m.user_id))}
              className="text-xs text-muted underline"
            >
              전원
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="나눌 사람">
            {members.map((m) => {
              const on = splitWith.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSplit(m.user_id)}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-sm ${
                    on ? "bg-accent font-medium text-white" : "border border-field-line bg-field text-muted"
                  }`}
                >
                  {on && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                  {m.display_name}
                  {m.user_id === me && " (나)"}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            {splitWith.length === 1 && splitWith[0] === paidBy
              ? "개인 지출이에요. 정산에서 빠져요."
              : `${splitWith.length}명이 똑같이 나눠요.`}
          </p>
        </div>
      )}

      {!domestic && (
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
      )}

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
          {domestic ? (
            <span className="flex h-12 shrink-0 items-center px-1 text-base text-muted">원</span>
          ) : (
            <Segmented
              value={currency}
              options={[
                { value: tripCurrency, label: tripCurrency },
                { value: "KRW", label: "KRW" },
              ]}
              onChange={setCurrency}
              className="w-36 shrink-0"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={label}>내용</label>
        <input id="title" name="title" required maxLength={60} defaultValue={v?.title} placeholder={domestic ? "흑돼지 구이" : "이치란 라멘"} className={field} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${label} mb-2`}>카테고리</legend>
        <CategoryChips items={LOCAL_CATEGORIES} defaultValue={v?.category ?? "food"} />
        <p className="mt-1 text-xs text-muted">예약·결제</p>
        <CategoryChips items={BOOKING_CATEGORIES} defaultValue={v?.category ?? "food"} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className={label}>결제 수단</span>
        <Segmented
          value={method}
          options={(domestic ? DOMESTIC_METHODS : PAYMENT_METHODS).map((m) => ({ value: m.value, label: m.label }))}
          onChange={setMethod}
        />
        {!domestic && (
          <p className="text-xs text-muted">{PAYMENT_METHODS.find((m) => m.value === method)?.hint}</p>
        )}
      </div>

      {method === "credit" && currency !== "KRW" && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-chip p-4">
          <label htmlFor="amount_krw_actual" className={label}>
            명세서 실제 금액 <span className="font-normal text-muted">(선택)</span>
          </label>
          <div className="flex items-center gap-2">
            <AmountInput
              id="amount_krw_actual"
              name="amount_krw_actual"
              defaultValue={v?.amount_krw_actual}
              placeholder="카드사 청구 원화"
              className={`${field} text-right tabular-nums`}
            />
            <span className="shrink-0 text-sm text-muted">원</span>
          </div>
          <p className="text-xs text-muted">비워두면 여행 기본 환율로 예상 금액을 계산해요.</p>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor="spent_on" className={label}>날짜</label>
        <input id="spent_on" name="spent_on" type="date" required defaultValue={v?.spent_on ?? today} className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="memo" className={label}>
          메모 <span className="font-normal text-muted">(선택)</span>
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          maxLength={500}
          defaultValue={v?.memo}
          placeholder="같이 간 사람, 맛 평가, 영수증 위치 등"
          className={`${field} h-auto resize-none py-3 leading-relaxed`}
        />
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
          <span className="flex h-9 items-center gap-1 rounded-full border border-field-line bg-field px-3 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
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
    <div className={`grid h-12 grid-flow-col auto-cols-fr gap-1 rounded-xl bg-line p-1 ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg text-sm font-medium ${
            value === o.value ? "bg-field text-ink shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
