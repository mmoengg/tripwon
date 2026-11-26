"use server";

import { randomBytes } from "node:crypto";
import { refreshTrips } from "@/lib/refresh";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyUserId, getTrip } from "@/lib/trips";

// 권한은 DB(RLS·함수)가 최종 판단. 여기서는 친절한 에러 문구를 위해 한 번 더 확인

// 초대 링크 만들기 / 새로 바꾸기 (이전 링크는 바로 못 쓰게 됨)
export async function createInvite(tripId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const code = randomBytes(18).toString("base64url"); // 24자, URL에 안전한 문자만
  const { data, error } = await supabase.from("trips").update({ invite_code: code }).eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "여행을 만든 사람만 초대 링크를 만들 수 있어요." };
  refreshTrips();
  return {};
}

// 초대 링크 끄기
export async function disableInvite(tripId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").update({ invite_code: null }).eq("id", tripId).select("id");
  if (error || !data?.length) return { error: "여행을 만든 사람만 링크를 끌 수 있어요." };
  refreshTrips();
  return {};
}

// 만든 사람이 멤버 내보내기
export async function removeMember(tripId: string, userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .select("user_id");
  if (error || !data?.length) return { error: "내보내지 못했어요." };
  refreshTrips();
  return {};
}

// 동행자가 여행에서 나가기
export async function leaveTrip(tripId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const me = await getMyUserId();
  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", me ?? "")
    .select("user_id");
  if (error || !data?.length) return { error: "나가지 못했어요. 여행을 만든 사람은 나갈 수 없어요." };
  refreshTrips();
  redirect("/");
}

export type RenameState = { error?: string; ok?: boolean };

// 이 여행에서 보이는 내 이름 바꾸기
export async function renameMe(tripId: string, _prev: RenameState, formData: FormData): Promise<RenameState> {
  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 1 || name.length > 40) return { error: "이름은 1~40자로 적어주세요." };
  const supabase = await createClient();
  const me = await getMyUserId();
  const { data, error } = await supabase
    .from("trip_members")
    .update({ display_name: name })
    .eq("trip_id", tripId)
    .eq("user_id", me ?? "")
    .select("user_id");
  if (error || !data?.length) return { error: "저장하지 못했어요." };
  refreshTrips();
  return { ok: true };
}

// 초대 링크로 참여 → 그 여행으로 이동
export async function joinTrip(code: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_trip", { code });
  if (error || !data) return { error: "초대 링크가 바뀌었거나 꺼졌어요. 만든 사람에게 새 링크를 받아주세요." };
  const tripId = data as string;
  const trip = await getTrip(tripId);
  if (!trip) return { error: "여행을 찾을 수 없어요." };
  refreshTrips();
  redirect(`/trips/${tripId}`);
}
