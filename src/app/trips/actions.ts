"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrencyCode } from "@/lib/currencies";

export type TripFormState = { error?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createTrip(
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const supabase = await createClient();
  // 페이지가 로그인 뒤에 있어도 액션은 따로 호출될 수 있으므로 여기서도 확인
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "로그인이 필요해요." };

  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "");
  const rateRaw = String(formData.get("rate_krw") ?? "").replaceAll(",", "").trim();
  const startDate = String(formData.get("start_date") ?? "") || null;
  const endDate = String(formData.get("end_date") ?? "") || null;
  const rate = Number(rateRaw);

  if (name.length < 1 || name.length > 50) return { error: "여행 이름은 1~50자로 적어주세요." };
  if (!isCurrencyCode(currency)) return { error: "통화를 목록에서 골라주세요." };
  // numeric(12,4) → 정수부 최대 8자리
  if (!rateRaw || !Number.isFinite(rate) || rate <= 0 || rate >= 1e8)
    return { error: "환율은 0보다 큰 숫자로 적어주세요." };
  if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate)))
    return { error: "날짜 형식이 올바르지 않아요." };
  if (startDate && endDate && endDate < startDate)
    return { error: "종료일이 시작일보다 빨라요." };

  // user_id는 DB 기본값 auth.uid()로 채워지고, RLS가 본인 것만 허용
  const { error } = await supabase.from("trips").insert({
    name,
    currency,
    rate_krw: rate,
    start_date: startDate,
    end_date: endDate,
  });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };

  revalidatePath("/");
  redirect("/");
}
