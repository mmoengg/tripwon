"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 송금 완료 기록: 보낸 사람·받은 사람·여행 만든 사람만 (DB 정책이 최종 확인)
export async function markSettled(
  tripId: string,
  fromUser: string,
  toUser: string,
  amount: number,
): Promise<{ error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: "금액이 올바르지 않아요." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("settlements")
    .insert({ trip_id: tripId, from_user: fromUser, to_user: toUser, amount_krw: Math.round(amount) });
  if (error) return { error: "보낸 사람·받은 사람·여행을 만든 사람만 완료로 표시할 수 있어요." };
  revalidatePath(`/trips/${tripId}/settle`);
  revalidatePath(`/trips/${tripId}`);
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
  revalidatePath(`/trips/${tripId}/settle`);
  revalidatePath(`/trips/${tripId}`);
  return {};
}
