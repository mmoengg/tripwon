"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrip } from "@/lib/trips";

export type ExchangeFormValues = {
  kind: string;
  exchanged_on: string;
  krw_amount: string;
  foreign_amount: string;
};

export type ExchangeFormState = { error?: string; values?: ExchangeFormValues };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (s: string) => Number(s.replaceAll(",", "").trim());

function readValues(formData: FormData): ExchangeFormValues {
  const g = (k: string) => String(formData.get(k) ?? "");
  return { kind: g("kind"), exchanged_on: g("exchanged_on"), krw_amount: g("krw_amount"), foreign_amount: g("foreign_amount") };
}

// 공통 검증: 로그인 + 내 여행 + 필드
async function validate(tripId: string, values: ExchangeFormValues) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "로그인이 필요해요." } as const;

  const trip = await getTrip(tripId);
  if (!trip) return { error: "여행을 찾을 수 없어요." } as const;

  const krw = num(values.krw_amount);
  const foreign = num(values.foreign_amount);

  if (values.kind !== "prepaid" && values.kind !== "cash") return { error: "충전카드인지 현금인지 골라주세요." } as const;
  if (!DATE_RE.test(values.exchanged_on)) return { error: "날짜를 골라주세요." } as const;
  if (!Number.isFinite(krw) || krw <= 0 || krw >= 1e14) return { error: "낸 원화를 숫자로 적어주세요." } as const;
  if (!Number.isFinite(foreign) || foreign <= 0 || foreign >= 1e12)
    return { error: `받은 ${trip.currency} 금액을 숫자로 적어주세요.` } as const;

  return {
    supabase,
    trip,
    row: {
      kind: values.kind,
      exchanged_on: values.exchanged_on,
      krw_amount: Math.round(krw),
      foreign_amount: Math.round(foreign * 100) / 100,
    },
  } as const;
}

export async function createExchange(
  tripId: string,
  _prev: ExchangeFormState,
  formData: FormData,
): Promise<ExchangeFormState> {
  const values = readValues(formData);
  const r = await validate(tripId, values);
  if ("error" in r) return { error: r.error, values };

  const { error } = await r.supabase.from("exchanges").insert({ trip_id: r.trip.id, ...r.row });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  revalidatePath(`/trips/${r.trip.id}`);
  redirect(`/trips/${r.trip.id}`);
}

export async function updateExchange(
  tripId: string,
  exchangeId: string,
  _prev: ExchangeFormState,
  formData: FormData,
): Promise<ExchangeFormState> {
  const values = readValues(formData);
  const r = await validate(tripId, values);
  if ("error" in r) return { error: r.error, values };

  const { data, error } = await r.supabase
    .from("exchanges")
    .update(r.row)
    .eq("id", exchangeId)
    .eq("trip_id", r.trip.id)
    .select("id");
  if (error || !data?.length) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  revalidatePath(`/trips/${r.trip.id}`);
  redirect(`/trips/${r.trip.id}`);
}

export async function deleteExchange(tripId: string, exchangeId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "로그인이 필요해요." };

  const { data, error } = await supabase.from("exchanges").delete().eq("id", exchangeId).eq("trip_id", tripId).select("id");
  if (error) return { error: "삭제하지 못했어요. 잠시 후 다시 시도해주세요." };
  if (!data?.length) return { error: "내 충전·환전 기록만 삭제할 수 있어요." };

  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}
