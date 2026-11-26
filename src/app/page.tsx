import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { currencyName } from "@/lib/currencies";
import { formatTripRange } from "@/lib/format";

type TripRow = {
  id: string;
  name: string;
  currency: string;
  start_date: string | null;
  end_date: string | null;
};

// 세션을 읽으므로 Suspense 안에서만 렌더링 (cacheComponents 규칙)
async function TripList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, name, currency, start_date, end_date")
    .order("created_at", { ascending: false })
    .returns<TripRow[]>();

  if (error) {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">여행 목록을 불러오지 못했어요.</p>;
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
        <p className="font-medium">아직 여행이 없어요</p>
        <p className="text-sm text-muted">첫 여행을 만들고 지출을 기록해보세요.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((t) => (
        <li key={t.id}>
          <Link href={`/trips/${t.id}`} className="block rounded-2xl border border-line p-4 hover:bg-paper">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{t.name}</p>
            <span className="shrink-0 rounded-full bg-line-soft px-2 py-0.5 text-xs text-muted">
              {t.currency}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatTripRange(t.start_date, t.end_date)} · {currencyName(t.currency)}
          </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TripListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="h-[76px] animate-pulse rounded-2xl bg-line-soft" />
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">내 여행</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-muted underline">로그아웃</button>
        </form>
      </header>

      <Link
        href="/trips/new"
        className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-white"
      >
        + 새 여행
      </Link>

      <Suspense fallback={<TripListSkeleton />}>
        <TripList />
      </Suspense>
    </main>
  );
}
