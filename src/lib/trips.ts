import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/payment-methods";

export type Trip = {
  id: string;
  name: string;
  currency: string;
  rate_krw: number;
  start_date: string | null;
  end_date: string | null;
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
  spent_on: string;
  amount_krw: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 내 여행이 아니거나 없는 id면 null (RLS가 남의 여행은 안 보여줌)
export async function getTrip(id: string): Promise<Trip | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select("id, name, currency, rate_krw, start_date, end_date")
    .eq("id", id)
    .maybeSingle<Trip>();
  // numeric 컬럼은 문자열로 올 수 있어서 숫자로 맞춤
  return data ? { ...data, rate_krw: Number(data.rate_krw) } : null;
}

export async function getExpenses(tripId: string): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_krw")
    .select("id, title, category, amount, currency, paid_where, method, spent_on, amount_krw, rate_source")
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

export async function getWallet(tripId: string): Promise<Wallet> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trip_wallet")
    .select("exchanged_krw, exchanged_foreign, avg_rate, spent_foreign, balance_foreign")
    .eq("trip_id", tripId)
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

export async function getExchanges(tripId: string): Promise<ExchangeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchanges")
    .select("id, kind, exchanged_on, krw_amount, foreign_amount")
    .eq("trip_id", tripId)
    .order("exchanged_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ExchangeRow[]>();
  return (data ?? []).map((x) => ({ ...x, krw_amount: Number(x.krw_amount), foreign_amount: Number(x.foreign_amount) }));
}
