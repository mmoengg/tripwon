"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCategory } from "@/lib/categories";
import { isPaymentMethod } from "@/lib/payment-methods";
import { getTrip, type Trip } from "@/lib/trips";

export type ExpenseFormValues = {
  title: string;
  category: string;
  amount: string;
  currency: string;
  paid_where: string;
  method: string;
  spent_on: string;
  amount_krw_actual: string;
};

// 에러일 때 입력값을 돌려줘서 폼 초기화 뒤에도 값이 남게 함
export type ExpenseFormState = { error?: string; values?: ExpenseFormValues };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (s: string) => Number(s.replaceAll(",", "").trim());

function readValues(formData: FormData): ExpenseFormValues {
  const g = (k: string) => String(formData.get(k) ?? "");
  return {
    title: g("title"),
    category: g("category"),
    amount: g("amount"),
    currency: g("currency"),
    paid_where: g("paid_where"),
    method: g("method"),
    spent_on: g("spent_on"),
    amount_krw_actual: g("amount_krw_actual"),
  };
}

// 공통 검증: 로그인 + 내 여행 + 필드. 성공하면 DB에 넣을 row 반환
async function validate(tripId: string, values: ExpenseFormValues) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "로그인이 필요해요." } as const;

  const trip: Trip | null = await getTrip(tripId);
  if (!trip) return { error: "여행을 찾을 수 없어요." } as const;

  const title = values.title.trim();
  const amountRaw = values.amount.replaceAll(",", "").trim();
  const amount = Number(amountRaw);

  if (title.length < 1 || title.length > 60) return { error: "내용은 1~60자로 적어주세요." } as const;
  if (!isCategory(values.category)) return { error: "카테고리를 골라주세요." } as const;
  // numeric(14,2) → 정수부 최대 12자리
  if (!amountRaw || !Number.isFinite(amount) || amount < 0 || amount >= 1e12)
    return { error: "금액을 숫자로 적어주세요." } as const;
  if (values.currency !== trip.currency && values.currency !== "KRW")
    return { error: "통화가 올바르지 않아요." } as const;
  if (values.paid_where !== "local" && values.paid_where !== "korea")
    return { error: "결제 장소를 골라주세요." } as const;
  if (!isPaymentMethod(values.method)) return { error: "결제 수단을 골라주세요." } as const;
  if (!DATE_RE.test(values.spent_on)) return { error: "날짜를 골라주세요." } as const;

  // 명세서 실제 금액: 신용카드 + 현지 통화일 때만 의미 있음. 그 외엔 비움
  let actual: number | null = null;
  if (values.method === "credit" && values.currency !== "KRW" && values.amount_krw_actual.trim()) {
    actual = num(values.amount_krw_actual);
    if (!Number.isFinite(actual) || actual < 0 || actual >= 1e14)
      return { error: "명세서 금액을 숫자로 적어주세요." } as const;
    actual = Math.round(actual);
  }

  return {
    supabase,
    trip,
    row: {
      title,
      category: values.category,
      amount: Math.round(amount * 100) / 100,
      currency: values.currency,
      paid_where: values.paid_where,
      method: values.method,
      spent_on: values.spent_on,
      amount_krw_actual: actual,
    },
  } as const;
}

export async function createExpense(
  tripId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const values = readValues(formData);
  const r = await validate(tripId, values);
  if ("error" in r) return { error: r.error, values };

  const { error } = await r.supabase.from("expenses").insert({ trip_id: r.trip.id, ...r.row });
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  revalidatePath(`/trips/${r.trip.id}`);
  redirect(`/trips/${r.trip.id}`);
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const values = readValues(formData);
  const r = await validate(tripId, values);
  if ("error" in r) return { error: r.error, values };

  // RLS가 본인 것만 허용. trip_id까지 조건으로 걸어 다른 여행 지출을 못 건드리게
  const { data, error } = await r.supabase
    .from("expenses")
    .update(r.row)
    .eq("id", expenseId)
    .eq("trip_id", r.trip.id)
    .select("id");
  if (error || !data?.length) return { error: "저장하지 못했어요. 잠시 후 다시 시도해주세요.", values };

  revalidatePath(`/trips/${r.trip.id}`);
  redirect(`/trips/${r.trip.id}`);
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "로그인이 필요해요." };

  const { error } = await supabase.from("expenses").delete().eq("id", expenseId).eq("trip_id", tripId);
  if (error) return { error: "삭제하지 못했어요. 잠시 후 다시 시도해주세요." };

  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}
