"use server";

import { refreshTrips } from "@/lib/refresh";
import { createClient } from "@/lib/supabase/server";

// '따로 관리' 공금에 돈 넣기 (곗돈 등). 여행 만든 사람·총무만 — DB 정책이 최종 확인
export async function addPoolFund(
  tripId: string,
  input: { currency: string; amount: number; krwAmount: number | null; memo: string },
): Promise<{ error?: string }> {
  const { currency, amount, krwAmount } = input;
  const memo = input.memo.trim();
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12) return { error: "금액을 숫자로 적어주세요." };
  if (krwAmount !== null && (!Number.isFinite(krwAmount) || krwAmount <= 0 || krwAmount >= 1e14))
    return { error: "원화 금액을 숫자로 적어주세요." };
  if (memo.length > 50) return { error: "메모는 50자까지 적을 수 있어요." };
  const supabase = await createClient();
  const { error } = await supabase.from("pool_funds").insert({
    trip_id: tripId,
    currency,
    amount: Math.round(amount * 100) / 100,
    krw_amount: currency === "KRW" || krwAmount === null ? null : Math.round(krwAmount),
    memo: memo || null,
  });
  if (error) return { error: "여행을 만든 사람과 총무만 공금을 넣을 수 있어요." };
  refreshTrips();
  return {};
}

// 공금 기록 지우기: 기록한 사람·여행 만든 사람
export async function deletePoolFund(tripId: string, fundId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pool_funds")
    .delete()
    .eq("id", fundId)
    .eq("trip_id", tripId)
    .select("id");
  if (error || !data?.length) return { error: "기록한 사람이나 여행을 만든 사람만 지울 수 있어요." };
  refreshTrips();
  return {};
}
