import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/payment-methods";

export type Trip = {
  id: string;
  name: string;
  currency: string;
  rate_krw: number;
  start_date: string | null;
  end_date: string | null;
  user_id: string; // 만든 사람
  invite_code: string | null;
};

export type Member = {
  user_id: string;
  role: "owner" | "member";
  display_name: string;
};

export type ExpenseRow = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  paid_where: "local" | "korea";
  method: PaymentMethod;
  rate_source: "krw" | "actual" | "exchange" | "trip";
  memo: string | null;
  spent_on: string;
  amount_krw: number;
  user_id: string; // 적은 사람 (수정·삭제 권한)
  paid_by: string | null; // 낸 사람
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 내 여행이 아니거나 없는 id면 null (RLS가 남의 여행은 안 보여줌)
export async function getTrip(id: string): Promise<Trip | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select("id, name, currency, rate_krw, start_date, end_date, user_id, invite_code")
    .eq("id", id)
    .maybeSingle<Trip>();
  // numeric 컬럼은 문자열로 올 수 있어서 숫자로 맞춤
  return data ? { ...data, rate_krw: Number(data.rate_krw) } : null;
}

export async function getExpenses(tripId: string): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_krw")
    .select("id, title, category, amount, currency, paid_where, method, spent_on, amount_krw, rate_source, memo, user_id, paid_by")
    .eq("trip_id", tripId)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ExpenseRow[]>();
  return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount), amount_krw: Number(e.amount_krw) }));
}

export type Wallet = {
  exchanged_krw: number;
  exchanged_foreign: number;
  avg_rate: number | null;
  spent_foreign: number;
  balance_foreign: number;
};

export type ExchangeRow = {
  id: string;
  kind: "prepaid" | "cash";
  exchanged_on: string;
  krw_amount: number;
  foreign_amount: number;
};

// 로그인한 사람의 id (JWT의 sub)
export async function getMyUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

// 지갑은 사람마다 따로: 내 지갑만
export async function getWallet(tripId: string): Promise<Wallet> {
  const supabase = await createClient();
  const me = await getMyUserId();
  const { data } = await supabase
    .from("trip_wallet")
    .select("exchanged_krw, exchanged_foreign, avg_rate, spent_foreign, balance_foreign")
    .eq("trip_id", tripId)
    .eq("user_id", me ?? "")
    .maybeSingle<Record<keyof Wallet, string | number | null>>();
  const n = (v: string | number | null | undefined) => Number(v ?? 0);
  return {
    exchanged_krw: n(data?.exchanged_krw),
    exchanged_foreign: n(data?.exchanged_foreign),
    avg_rate: data?.avg_rate == null ? null : Number(data.avg_rate),
    spent_foreign: n(data?.spent_foreign),
    balance_foreign: n(data?.balance_foreign),
  };
}

// 내 충전·환전 기록만 (동행자 것은 각자 지갑)
export async function getExchanges(tripId: string): Promise<ExchangeRow[]> {
  const supabase = await createClient();
  const me = await getMyUserId();
  const { data } = await supabase
    .from("exchanges")
    .select("id, kind, exchanged_on, krw_amount, foreign_amount")
    .eq("trip_id", tripId)
    .eq("user_id", me ?? "")
    .order("exchanged_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ExchangeRow[]>();
  return (data ?? []).map((x) => ({ ...x, krw_amount: Number(x.krw_amount), foreign_amount: Number(x.foreign_amount) }));
}

export type ExpenseRecord = {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  paid_where: string;
  method: string;
  spent_on: string;
  amount_krw_actual: number | null;
  memo: string | null;
  user_id: string;
  paid_by: string | null;
};

export async function getExpense(tripId: string, expenseId: string): Promise<ExpenseRecord | null> {
  if (!UUID_RE.test(expenseId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, title, category, amount, currency, paid_where, method, spent_on, amount_krw_actual, memo, user_id, paid_by")
    .eq("id", expenseId)
    .eq("trip_id", tripId)
    .maybeSingle<ExpenseRecord>();
  return data;
}

export async function getExchange(tripId: string, exchangeId: string): Promise<ExchangeRow | null> {
  if (!UUID_RE.test(exchangeId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchanges")
    .select("id, kind, exchanged_on, krw_amount, foreign_amount")
    .eq("id", exchangeId)
    .eq("trip_id", tripId)
    .eq("user_id", (await getMyUserId()) ?? "") // 내 기록만 수정 화면에서 열림
    .maybeSingle<ExchangeRow>();
  return data ? { ...data, krw_amount: Number(data.krw_amount), foreign_amount: Number(data.foreign_amount) } : null;
}

// 여행 삭제 경고 문구용
export async function getTripCounts(tripId: string) {
  const supabase = await createClient();
  const [e, x] = await Promise.all([
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
    supabase.from("exchanges").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
  ]);
  return { expenses: e.count ?? 0, exchanges: x.count ?? 0 };
}

// 여행 멤버 (만든 사람 먼저, 그다음 참여한 순서)
export async function getMembers(tripId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_members")
    .select("user_id, role, display_name, joined_at")
    .eq("trip_id", tripId)
    .order("joined_at", { ascending: true })
    .returns<(Member & { joined_at: string })[]>();
  return (data ?? [])
    .map(({ user_id, role, display_name }) => ({ user_id, role, display_name }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));
}
