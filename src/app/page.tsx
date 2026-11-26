import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { currencySymbol } from "@/lib/currencies";
import { formatKrw, formatTripRange, todayInSeoul } from "@/lib/format";

type TripRow = {
  id: string;
  name: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
};

// 여행 상태 배지: 여행 중 / D-n / 지난 여행 / (날짜 없음)
function tripStatus(t: TripRow, today: string) {
  if (!t.start_date) return null;
  const end = t.end_date ?? t.start_date;
  if (today >= t.start_date && today <= end) return { label: "여행 중", tone: "now" as const };
  if (today < t.start_date) {
    const days = Math.round(
      (new Date(`${t.start_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000,
    );
    return { label: `D-${days}`, tone: "soon" as const };
  }
  return { label: "지난 여행", tone: "past" as const };
}

// 세션을 읽으므로 Suspense 안에서만 렌더링 (cacheComponents 규칙)
async function TripList() {
  const supabase = await createClient();
  const [{ data, error }, { data: sums }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, name, currency, start_date, end_date")
      .order("created_at", { ascending: false })
      .returns<TripRow[]>(),
    // 여행별 원화 합계·건수 (개인용이라 지출 수가 많지 않음 → 받아서 더함)
    supabase.from("expense_krw").select("trip_id, amount_krw").returns<{ trip_id: string; amount_krw: number }[]>(),
  ]);

  if (error) {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">여행 목록을 불러오지 못했어요.</p>;
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-chip px-6 py-12 text-center">
        <p className="font-serif text-lg font-extrabold">첫 여행을 떠나볼까요?</p>
        <p className="text-sm text-muted">여행을 만들고 쓴 돈을 원화로 기록해보세요.</p>
      </div>
    );
  }

  const totals = new Map<string, { krw: number; count: number }>();
  for (const s of sums ?? []) {
    const t = totals.get(s.trip_id) ?? { krw: 0, count: 0 };
    t.krw += Number(s.amount_krw);
    t.count += 1;
    totals.set(s.trip_id, t);
  }
  const today = todayInSeoul();

  // 정렬: 여행 중 → 다가오는 여행(가까운 순) → 날짜 없음 → 지난 여행(최근 순)
  const rank = (t: TripRow) => {
    const st = tripStatus(t, today);
    return st?.tone === "now" ? 0 : st?.tone === "soon" ? 1 : st ? 3 : 2;
  };
  const sorted = [...data].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (rank(a) === 1) return (a.start_date ?? "").localeCompare(b.start_date ?? "");
    if (rank(a) === 3) return (b.start_date ?? "").localeCompare(a.start_date ?? "");
    return 0;
  });

  return (
    <ul className="flex flex-col gap-4">
      {sorted.map((t) => {
        const total = totals.get(t.id) ?? { krw: 0, count: 0 };
        const status = tripStatus(t, today);
        return (
          <li key={t.id}>
            <Link
              href={`/trips/${t.id}`}
              className={`block overflow-hidden rounded-[14px] bg-card shadow-[0_1px_0_var(--color-line)] transition hover:-translate-y-0.5 ${
                status?.tone === "past" ? "opacity-80" : ""
              }`}
            >
              {/* 엽서 윗변: 항공우편 줄무늬 */}
              <div className="airmail h-1.5" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3 px-[18px] pt-4 pb-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-serif text-xl font-extrabold tracking-tight break-keep">{t.name}</p>
                  <span className="text-[13px] text-muted">{formatTripRange(t.start_date, t.end_date)}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className="flex h-11 w-10 rotate-[4deg] items-center justify-center rounded-sm border-2 border-dashed border-stamp font-serif text-lg font-extrabold text-stamp-ink"
                    aria-hidden="true"
                  >
                    {currencySymbol(t.currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-line px-[18px] py-3">
                <span className="text-sm tabular-nums">
                  <span className="font-semibold">{formatKrw(total.krw)}</span>
                  <span className="ml-1.5 text-xs text-muted">{total.count}건</span>
                </span>
                {status && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      status.tone === "now"
                        ? "bg-accent text-white"
                        : status.tone === "soon"
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-line-soft text-muted"
                    }`}
                  >
                    {status.label}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TripListSkeleton() {
  return (
    <ul className="flex flex-col gap-4" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="h-[150px] animate-pulse rounded-[14px] bg-card" />
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-serif text-[28px] font-extrabold tracking-tight">tripwon</h1>
          <span className="text-xs text-muted">내 여행</span>
        </div>
        <form action="/auth/signout" method="post">
          <button className="flex h-11 items-center text-sm text-muted underline hover:text-ink">로그아웃</button>
        </form>
      </header>

      <Link
        href="/trips/new"
        className="flex h-[50px] items-center justify-center rounded-xl bg-accent font-semibold text-white"
      >
        + 새 여행
      </Link>

      <Suspense fallback={<TripListSkeleton />}>
        <TripList />
      </Suspense>
    </main>
  );
}
