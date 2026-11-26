"use server";

import { refreshTrips } from "@/lib/refresh";
import { createClient } from "@/lib/supabase/server";
import { POOL } from "@/lib/settlement";

// 송금 완료 기록: 주고받은 사람 · 여행 만든 사람 · (공금이 끼면) 총무 (DB 정책이 최종 확인)
// fromUser / toUser가 POOL이면 그쪽은 공금 → DB에는 null로
export async function markSettled(
  tripId: string,
  fromUser: string,
  toUser: string,
  amount: number,
): Promise<{ error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "금액이 올바르지 않아요." };
  const supabase = await createClient();
  const { error } = await supabase.from("settlements").insert({
    trip_id: tripId,
    from_user: fromUser === POOL ? null : fromUser,
    to_user: toUser === POOL ? null : toUser,
    amount_krw: Math.round(amount),
  });
  if (error) return { error: "주고받은 사람·총무·여행을 만든 사람만 완료로 표시할 수 있어요." };
  refreshTrips();
  return {};
}

// 송금 완료 취소: 기록한 사람 또는 여행 만든 사람
export async function undoSettlement(tripId: string, settlementId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settlements")
    .delete()
    .eq("id", settlementId)
    .eq("trip_id", tripId)
    .select("id");
  if (error || !data?.length) return { error: "기록한 사람이나 여행을 만든 사람만 취소할 수 있어요." };
  refreshTrips();
  return {};
}

// 공금 입금: 멤버 → 공금 (총무 본인 회비도 똑같이 적음). 총무·여행 만든 사람·입금한 본인이 기록
export async function markDeposit(tripId: string, fromUser: string, amount: number): Promise<{ error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e14) return { error: "금액을 숫자로 적어주세요." };
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("treasurer_id").eq("id", tripId).maybeSingle();
  if (!trip?.treasurer_id) return { error: "멤버 화면에서 총무를 먼저 정해주세요." };
  const { error } = await supabase
    .from("settlements")
    .insert({ trip_id: tripId, from_user: fromUser, to_user: null, amount_krw: Math.round(amount), kind: "deposit" });
  if (error) return { error: "총무·여행을 만든 사람·입금한 본인만 기록할 수 있어요." };
  refreshTrips();
  return {};
}
