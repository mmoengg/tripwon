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

export async function createExchange(
  tripId: string,
  _prev: ExchangeFormState,
  formData: FormData,
): Promise<ExchangeFormState> {
  const values: ExchangeFormValues = {
    kind: String(formData.get("kind") ?? ""),
    exchanged_on: String(formData.get("exchanged_on") ?? ""),
    krw_amount: String(formData.get("krw_amount") ?? ""),
    foreign_amount: String(formData.get("foreign_amount") ?? ""),
  };
  const fail = (error: string): ExchangeFormState => ({ error, values });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail("로그인이 필요해요.");

  const trip = await getTrip(tripId);
  if (!trip) return fail("여행을 찾을 수 없어요.");

  const krw = num(values.krw_amount);
  const foreign = num(values.foreign_amount);

  if (values.kind !== "prepaid" && values.kind !== "cash") return fail("충전카드인지 현금인지 골라주세요.");
  if (!DATE_RE.test(values.exchanged_on)) return fail("날짜를 골라주세요.");
  if (!Number.isFinite(krw) || krw <= 0 || krw >= 1e14) return fail("낸 원화를 숫자로 적어주세요.");
  if (!Number.isFinite(foreign) || foreign <= 0 || foreign >= 1e12)
    return fail(`받은 ${trip.currency} 금액을 숫자로 적어주세요.`);

  const { error } = await supabase.from("exchanges").insert({
    trip_id: trip.id,
    kind: values.kind,
    exchanged_on: values.exchanged_on,
    krw_amount: Math.round(krw),
    foreign_amount: Math.round(foreign * 100) / 100,
  });
  if (error) return fail("저장하지 못했어요. 잠시 후 다시 시도해주세요.");

  revalidatePath(`/trips/${trip.id}`);
  redirect(`/trips/${trip.id}`);
}
