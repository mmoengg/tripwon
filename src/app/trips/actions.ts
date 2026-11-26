"use server";

import { refreshTrips } from "@/lib/refresh";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrencyCode } from "@/lib/currencies";
import { getKrwRate, type KrwRate } from "@/lib/rates";
import { getTrip } from "@/lib/trips";

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

function readValues(formData: FormData): TripFormValues {
  const g = (k: string) => String(formData.get(k) ?? "");
  return {
    name: g("name"),
    currency: g("currency"),
    rate_krw: g("rate_krw"),
    start_date: g("start_date"),
    end_date: g("end_date"),
  };
}

// 공통 필드 검증 (통화 제외). 성공하면 DB row 반환
function validateFields(values: TripFormValues) {
  const name = values.name.trim();
  const rateRaw = values.rate_krw.replaceAll(",", "").trim();
  const rate = Number(rateRaw);
  const startDate = values.start_date || null;
  const endDate = values.end_date || null;

  if (name.length < 1 || name.length > 50) return { error: "여행 이름은 1~50자로 적어주세요." } as const;
  // numeric(12,4) → 정수부 최대 8자리
  if (!rateRaw || !Number.isFinite(rate) || rate <= 0 || rate >= 1e8)
    return { error: "환율은 0보다 큰 숫자로 적어주세요." } as const;
  if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate)))
    return { error: "날짜 형식이 올바르지 않아요." } as const;
  if (startDate && endDate && endDate < startDate) return { error: "종료일이 시작일보다 빨라요." } as const;

  return { row: { name, rate_krw: rate, start_date: startDate, end_date: endDate } } as const;
}

async function requireUser() {
  const supabase = await createClient();
  // 페이지가 로그인 뒤에 있어도 액션은 따로 호출될 수 있으므로 여기서도 확인
  const { data: auth } = await supabase.auth.getClaims();
  return auth?.claims ? supabase : null;
}

export async function createTrip(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const values = readValues(formData);
  const supabase = await requireUser();
  if (!supabase) return { error: "로그인이 필요해요.", values };

  if (!isCurrencyCode(values.currency)) return { error: "통화를 목록에서 골라주세요.", values };
  // 국내 여행(KRW)은 환율이 항상 1
  const r = validateFields(values.currency === "KRW" ? { ...values, rate_krw: "1" } : values);
  if ("error" in r) return { error: r.error, values };

  // user_id는 DB 기본값 auth.uid()로 채워지고, RLS가 본인 것만 허용
  const { error } = await supabase.from("trips").insert({ ...r.row, currency: values.currency });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  refreshTrips();
  redirect("/");
}

// 통화는 바꾸지 않음: 이미 그 통화로 적은 지출·환전 금액이 엉뚱한 값이 되므로
export async function updateTrip(
  tripId: string,
  _prev: TripFormState,
  formData: FormData,
): Promise<TripFormState> {
  const values = readValues(formData);
  const supabase = await requireUser();
  if (!supabase) return { error: "로그인이 필요해요.", values };

  const trip = await getTrip(tripId);
  if (!trip) return { error: "여행을 찾을 수 없어요.", values };

  const r = validateFields(trip.currency === "KRW" ? { ...values, rate_krw: "1" } : values);
  if ("error" in r) return { error: r.error, values };

  const { data, error } = await supabase.from("trips").update(r.row).eq("id", trip.id).select("id");
  if (error || !data?.length) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  refreshTrips();
  redirect(`/trips/${trip.id}`);
}

// 지출·환전 기록은 DB의 on delete cascade로 함께 삭제됨
export async function deleteTrip(tripId: string): Promise<{ error?: string }> {
  const supabase = await requireUser();
  if (!supabase) return { error: "로그인이 필요해요." };

  const { data, error } = await supabase.from("trips").delete().eq("id", tripId).select("id");
  if (error) return { error: "삭제하지 못했어요. 잠시 후 다시 시도해주세요." };
  if (!data?.length) return { error: "여행을 만든 사람만 삭제할 수 있어요." };

  refreshTrips();
  redirect("/");
}

// 새 여행 폼에서 통화를 고를 때 환율 기본값을 채우는 용도. 실패하면 null → 직접 입력
export async function fetchDefaultRate(currency: string): Promise<KrwRate | null> {
  if (!isCurrencyCode(currency)) return null;
  return getKrwRate(currency);
}
