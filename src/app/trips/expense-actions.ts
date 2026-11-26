"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCategory } from "@/lib/categories";
import { isPaymentMethod } from "@/lib/payment-methods";
import { getTrip } from "@/lib/trips";

export type ExpenseFormValues = {
  title: string;
  category: string;
  amount: string;
  currency: string;
  paid_where: string;
  method: string;
  spent_on: string;
};

// 에러일 때 입력값을 돌려줘서 폼 초기화 뒤에도 값이 남게 함
export type ExpenseFormState = { error?: string; values?: ExpenseFormValues };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function createExpense(
  tripId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const values: ExpenseFormValues = {
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    paid_where: String(formData.get("paid_where") ?? ""),
    method: String(formData.get("method") ?? ""),
    spent_on: String(formData.get("spent_on") ?? ""),
  };
  const fail = (error: string): ExpenseFormState => ({ error, values });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail("로그인이 필요해요.");

  // 내 여행인지 + 허용 통화(여행 통화 또는 KRW) 확인용
  const trip = await getTrip(tripId);
  if (!trip) return fail("여행을 찾을 수 없어요.");

  const title = values.title.trim();
  const amountRaw = values.amount.replaceAll(",", "").trim();
  const amount = Number(amountRaw);

  if (title.length < 1 || title.length > 60) return fail("내용은 1~60자로 적어주세요.");
  if (!isCategory(values.category)) return fail("카테고리를 골라주세요.");
  // numeric(14,2) → 정수부 최대 12자리
  if (!amountRaw || !Number.isFinite(amount) || amount < 0 || amount >= 1e12)
    return fail("금액을 숫자로 적어주세요.");
  if (values.currency !== trip.currency && values.currency !== "KRW")
    return fail("통화가 올바르지 않아요.");
  if (values.paid_where !== "local" && values.paid_where !== "korea")
    return fail("결제 장소를 골라주세요.");
  if (!isPaymentMethod(values.method)) return fail("결제 수단을 골라주세요.");
  if (!DATE_RE.test(values.spent_on)) return fail("날짜를 골라주세요.");

  const { error } = await supabase.from("expenses").insert({
    trip_id: trip.id,
    title,
    category: values.category,
    amount: Math.round(amount * 100) / 100,
    currency: values.currency,
    paid_where: values.paid_where,
    method: values.method,
    spent_on: values.spent_on,
  });
  if (error) return fail("저장하지 못했어요. 잠시 후 다시 시도해주세요.");

  revalidatePath(`/trips/${trip.id}`);
  redirect(`/trips/${trip.id}`);
}
