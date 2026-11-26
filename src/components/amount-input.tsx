"use client";

import { useEffect, useRef, type ComponentProps, type RefObject } from "react";

const MAX_INT_DIGITS = 12; // DB numeric(14,2) 정수부 한도

// "1234567.891" → "1,234,567.89" (decimals=2). 숫자·소수점 외 문자는 버림
export function formatAmountInput(raw: string, decimals: number) {
  let s = raw.replace(/[^\d.]/g, "");
  if (decimals === 0) {
    s = s.split(".")[0]; // 소수 불가: 소수점 이하는 버림 (1000.5 → 1000, 숫자를 이어붙이지 않음)
  } else {
    const dot = s.indexOf(".");
    if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replaceAll(".", "").slice(0, decimals);
  }
  const [rawInt, dec] = s.split(".");
  let int = rawInt.replace(/^0+(?=\d)/, "").slice(0, MAX_INT_DIGITS); // 앞자리 0 제거
  if (int === "" && dec !== undefined) int = "0"; // ".5" → "0.5"
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${withCommas}.${dec}` : withCommas;
}

type Props = Omit<ComponentProps<"input">, "type" | "inputMode" | "defaultValue" | "ref"> & {
  decimals?: number; // 허용 소수 자리 (원화 0, 외화 2, 환율 4)
  defaultValue?: string;
  onValueChange?: (formatted: string) => void;
  ref?: RefObject<HTMLInputElement | null>;
};

// 숫자만 입력되고 천 단위 콤마가 자동으로 붙는 금액 칸.
// 비제어 입력이라 폼 초기화·defaultValue와 그대로 호환됨. 서버는 콤마를 지우고 저장함
export function AmountInput({ decimals = 0, defaultValue, onValueChange, onInput, ref, ...rest }: Props) {
  const inner = useRef<HTMLInputElement | null>(null);

  // 통화를 KRW로 바꾸는 등 허용 소수 자리가 바뀌면 지금 값도 다시 맞춤
  useEffect(() => {
    const el = inner.current;
    if (!el?.value) return;
    const f = formatAmountInput(el.value, decimals);
    if (f !== el.value) {
      el.value = f;
      onValueChange?.(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimals]);

  return (
    <input
      {...rest}
      ref={(el) => {
        inner.current = el;
        if (ref) ref.current = el;
      }}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      defaultValue={defaultValue ? formatAmountInput(defaultValue, decimals) : undefined}
      onInput={(e) => {
        const el = e.currentTarget;
        // 커서 앞에 있던 숫자 개수를 기억했다가, 콤마가 붙은 뒤에도 같은 자리에 커서를 둠
        const caret = el.selectionStart ?? el.value.length;
        const digitsBefore = el.value.slice(0, caret).replace(/[^\d.]/g, "").length;
        const f = formatAmountInput(el.value, decimals);
        if (f !== el.value) {
          el.value = f;
          let pos = 0;
          for (let n = 0; pos < f.length && n < digitsBefore; pos++) if (/[\d.]/.test(f[pos])) n++;
          el.setSelectionRange(pos, pos);
        }
        onValueChange?.(f);
        onInput?.(e);
      }}
    />
  );
}
