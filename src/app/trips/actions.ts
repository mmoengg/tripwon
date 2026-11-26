"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrencyCode } from "@/lib/currencies";
import { getKrwRate, type KrwRate } from "@/lib/rates";

export type TripFormValues = {
  name: string;
  currency: string;
  rate_krw: string;
  start_date: string;
  end_date: string;
};

// 에러일 때 입력값을 같이 돌려줘서, React가 폼을 초기화해도 값이 다시 채워지게 함
export type TripFormState = { error?: string; values?: TripFormValues };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const values: TripFormValues = {
    name: String(formData.get("name") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    rate_krw: String(formData.get("rate_krw") ?? ""),
    start_date: String(formData.get("start_date") ?? ""),
    end_date: String(formData.get("end_date") ?? ""),
  };
  const fail = (error: string): TripFormState => ({ error, values });

  const supabase = await createClient();
  // 페이지가 로그인 뒤에 있어도 액션은 따로 호출될 수 있으므로 여기서도 확인
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail("로그인이 필요해요.");

  const name = values.name.trim();
  const currency = values.currency;
  const rateRaw = values.rate_krw.replaceAll(",", "").trim();
  const startDate = values.start_date || null;
  const endDate = values.end_date || null;
  const rate = Number(rateRaw);

  if (name.length < 1 || name.length > 50) return fail("여행 이름은 1~50자로 적어주세요.");
  if (!isCurrencyCode(currency)) return fail("통화를 목록에서 골라주세요.");
  // numeric(12,4) → 정수부 최대 8자리
  if (!rateRaw || !Number.isFinite(rate) || rate <= 0 || rate >= 1e8)
    return fail("환율은 0보다 큰 숫자로 적어주세요.");
  if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate)))
    return fail("날짜 형식이 올바르지 않아요.");
  if (startDate && endDate && endDate < startDate)
    return fail("종료일이 시작일보다 빨라요.");

  // user_id는 DB 기본값 auth.uid()로 채워지고, RLS가 본인 것만 허용
  const { error } = await supabase.from("trips").insert({
    name,
    currency,
    rate_krw: rate,
    start_date: startDate,
    end_date: endDate,
  });
  if (error) return fail("저장하지 못했어요. 잠시 후 다시 시도해주세요.");

  revalidatePath("/");
  redirect("/");
}

// 새 여행 폼에서 통화를 고를 때 환율 기본값을 채우는 용도. 실패하면 null → 직접 입력
export async function fetchDefaultRate(currency: string): Promise<KrwRate | null> {
  if (!isCurrencyCode(currency)) return null;
  return getKrwRate(currency);
}
