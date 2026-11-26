import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExchanges, getExpenses, getTrip, getWallet, type ExchangeRow, type ExpenseRow, type Trip, type Wallet } from "@/lib/trips";
import { categoryInfo } from "@/lib/categories";
import { paymentLabel } from "@/lib/payment-methods";
import { formatAmount, formatDayHeader, formatKrw, formatRate, formatTripRange } from "@/lib/format";

export default function TripPage({ params }: PageProps<"/trips/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Link href="/" className="text-sm text-neutral-500">← 내 여행</Link>
      {/* params와 세션 모두 런타임 데이터 → Suspense 안에서 읽음 (cacheComponents 규칙) */}
      <Suspense fallback={<TripSkeleton />}>
        {params.then(({ id }) => <TripDetail id={id} />)}
      </Suspense>
    </main>
  );
}

async function TripDetail({ id }: { id: string }) {
  const trip = await getTrip(id);
  if (!trip) notFound();
  const [expenses, wallet, exchanges] = await Promise.all([getExpenses(id), getWallet(id), getExchanges(id)]);
  const total = expenses.reduce((s, e) => s + e.amount_krw, 0);

  // 날짜별로 묶기 (이미 최신순 정렬)
  const byDay = new Map<string, ExpenseRow[]>();
  for (const e of expenses) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        <p className="text-sm text-neutral-500">
          {formatTripRange(trip.start_date, trip.end_date)} · 1 {trip.currency} = {trip.rate_krw}원
        </p>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-5 text-white">
        <p className="text-sm text-neutral-400">총 지출</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatKrw(total)}</p>
        <p className="mt-1 text-xs text-neutral-400">{expenses.length}건</p>
      </section>

      <WalletCard trip={trip} wallet={wallet} exchanges={exchanges} />

      <Link
        href={`/trips/${trip.id}/expenses/new`}
        className="flex h-12 items-center justify-center rounded-xl border border-neutral-900 font-medium"
      >
        + 지출 추가
      </Link>

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center">
          <p className="font-medium">아직 지출이 없어요</p>
          <p className="mt-1 text-sm text-neutral-500">항공권이나 숙소처럼 미리 낸 것부터 적어도 좋아요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...byDay].map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <h2 className="font-medium text-neutral-700">{formatDayHeader(day)}</h2>
                <span className="tabular-nums text-neutral-400">
                  {formatKrw(items.reduce((s, e) => s + e.amount_krw, 0))}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                {items.map((e) => (
                  <ExpenseItem key={e.id} e={e} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ExpenseItem({ e }: { e: ExpenseRow }) {
  const cat = categoryInfo(e.category);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl" aria-hidden>{cat.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{e.title}</p>
        <p className="text-xs text-neutral-500">
          {cat.label} · {paymentLabel(e.method)}
          {e.paid_where === "korea" && " · 한국에서 결제"}
        </p>
      </div>
      <div className="text-right tabular-nums">
        <p className="font-medium">
          {e.rate_source === "trip" && <span className="mr-1 text-xs font-normal text-neutral-400">예상</span>}
          {formatKrw(e.amount_krw)}
        </p>
        {e.currency !== "KRW" && (
          <p className="text-xs text-neutral-400">{formatAmount(e.amount, e.currency)}</p>
        )}
      </div>
    </li>
  );
}

// '환전한 돈' 주머니: 충전카드 충전 + 현금 환전
function WalletCard({ trip, wallet, exchanges }: { trip: Trip; wallet: Wallet; exchanges: ExchangeRow[] }) {
  const addHref = `/trips/${trip.id}/exchanges/new`;

  if (exchanges.length === 0) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">환전 기록이 없어요</p>
          <p className="text-xs text-neutral-500">충전·환전을 적으면 실제 환율로 계산하고 잔액도 보여줘요.</p>
        </div>
        <Link href={addHref} className="shrink-0 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium">
          + 충전/환전
        </Link>
      </section>
    );
  }

  const short = wallet.balance_foreign < 0;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">환전한 돈 잔액</p>
          <p className={`text-xl font-semibold tabular-nums ${short ? "text-red-600" : ""}`}>
            {formatAmount(wallet.balance_foreign, trip.currency)}
          </p>
          {short && <p className="text-xs text-red-600">기록된 충전·환전보다 더 썼어요. 빠진 충전이 있는지 확인해보세요.</p>}
        </div>
        <Link href={addHref} className="shrink-0 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium">
          + 충전/환전
        </Link>
      </div>
      <p className="text-xs text-neutral-500 tabular-nums">
        {formatAmount(wallet.exchanged_foreign, trip.currency)} 환전 ({formatKrw(wallet.exchanged_krw)}) · 평균 1 {trip.currency} ={" "}
        {formatRate(wallet.avg_rate ?? trip.rate_krw)}원
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-neutral-400">환전 기록 {exchanges.length}건</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {exchanges.map((x) => (
            <li key={x.id} className="flex justify-between gap-2 text-xs tabular-nums text-neutral-600">
              <span>
                {x.exchanged_on.slice(5).replace("-", "/")} · {x.kind === "prepaid" ? "충전카드" : "현금"}
              </span>
              <span>
                {formatKrw(x.krw_amount)} → {formatAmount(x.foreign_amount, trip.currency)}
                <span className="ml-1 text-neutral-400">({formatRate(x.krw_amount / x.foreign_amount)})</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function TripSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="h-14 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
      <div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
      <div className="h-12 animate-pulse rounded-xl bg-neutral-100" />
    </div>
  );
}
