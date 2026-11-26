import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExchanges, getExpenses, getTrip, getWallet, type ExchangeRow, type Trip, type Wallet } from "@/lib/trips";
import { currencyName, currencySymbol } from "@/lib/currencies";
import { formatAmount, formatKrw, formatRate, formatTripRange } from "@/lib/format";
import { ExpenseList } from "./expense-list";

export default function TripPage({ params }: PageProps<"/trips/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-6 pb-12">
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

  return (
    <>
      <nav className="flex items-center justify-between text-sm text-muted">
        <Link href="/" className="flex h-11 items-center gap-1 hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          내 여행
        </Link>
        <Link href={`/trips/${trip.id}/edit`} className="flex h-11 items-center underline hover:text-ink">
          수정
        </Link>
      </nav>

      <Postcard trip={trip} />

      <MoneyCard trip={trip} total={total} count={expenses.length} wallet={wallet} exchanges={exchanges} />

      <Link
        href={`/trips/${trip.id}/expenses/new`}
        className="flex h-[50px] items-center justify-center rounded-xl bg-accent font-semibold text-white"
      >
        + 지출 적기
      </Link>

      <div className="mt-1">
        <ExpenseList tripId={trip.id} startDate={trip.start_date} expenses={expenses} />
      </div>
    </>
  );
}

// 엽서: 항공우편 줄무늬 테두리 + 여행 이름 + 통화 우표
function Postcard({ trip }: { trip: Trip }) {
  return (
    <div className="airmail rounded-[10px] p-1.5">
      <div className="flex items-start justify-between gap-3 rounded-md bg-card px-[18px] py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs tracking-[2px] text-muted">
            {trip.currency} · {currencyName(trip.currency)}
          </span>
          <h1 className="font-serif text-[25px] font-extrabold tracking-tight break-keep">{trip.name}</h1>
          <span className="text-[13px] text-muted">{formatTripRange(trip.start_date, trip.end_date)}</span>
        </div>
        <div
          className="flex h-[62px] w-[54px] shrink-0 rotate-[4deg] flex-col items-center justify-center rounded border-2 border-dashed border-stamp text-stamp-ink"
          aria-label={`기본 환율 1 ${trip.currency} = ${formatRate(trip.rate_krw)}원`}
          role="img"
        >
          <span className="font-serif text-[21px] font-extrabold leading-none">{currencySymbol(trip.currency)}</span>
          <span className="mt-1 text-[11px] font-semibold">{formatRate(trip.rate_krw)}</span>
        </div>
      </div>
    </div>
  );
}

// 총 지출 + (절취선) + 지갑 잔액
function MoneyCard({
  trip,
  total,
  count,
  wallet,
  exchanges,
}: {
  trip: Trip;
  total: number;
  count: number;
  wallet: Wallet;
  exchanges: ExchangeRow[];
}) {
  const addHref = `/trips/${trip.id}/exchanges/new`;
  const hasExchanges = exchanges.length > 0;
  const short = wallet.balance_foreign < 0;
  const ratio = wallet.exchanged_foreign > 0 ? Math.max(0, Math.min(1, wallet.balance_foreign / wallet.exchanged_foreign)) : 0;

  return (
    <section className="flex flex-col gap-3 rounded-[14px] bg-card px-[18px] py-4 shadow-[0_1px_0_var(--color-line)]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted">총 지출 · {count}건</span>
          <span className="font-serif text-[32px] font-extrabold tracking-tight tabular-nums">{formatKrw(total)}</span>
        </div>
        {count > 0 && (
          <Link href={`/trips/${trip.id}/summary`} className="pb-1.5 text-[13px] text-muted hover:text-ink">
            요약 →
          </Link>
        )}
      </div>

      {/* 티켓 절취선: 양 끝 반원은 바탕색으로 뚫린 구멍처럼 */}
      <div className="-mx-7 my-0.5 flex items-center" aria-hidden="true">
        <span className="size-5 shrink-0 rounded-full bg-paper" />
        <span className="mx-1 flex-1 border-t-2 border-dashed border-line" />
        <span className="size-5 shrink-0 rounded-full bg-paper" />
      </div>

      {hasExchanges ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted">
                지갑 잔액 · 평균 {formatRate(wallet.avg_rate ?? trip.rate_krw)}원
              </span>
              <span className={`text-lg font-semibold tabular-nums ${short ? "text-red-700" : ""}`}>
                {formatAmount(wallet.balance_foreign, trip.currency).replace(` ${trip.currency}`, "")}
                <span className="ml-1 text-[13px] font-normal text-muted">
                  / {formatAmount(wallet.exchanged_foreign, trip.currency)}
                </span>
              </span>
            </div>
            <Link
              href={addHref}
              className="flex h-11 shrink-0 items-center rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent-ink"
            >
              + 충전
            </Link>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${ratio * 100}%` }} />
          </div>
          {short && <p className="text-xs text-red-700">기록된 충전·환전보다 더 썼어요. 빠진 충전이 있는지 확인해보세요.</p>}
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted">충전·환전 기록 {exchanges.length}건</summary>
            <ul className="mt-2 flex flex-col">
              {exchanges.map((x) => (
                <li key={x.id}>
                  <Link
                    href={`/trips/${trip.id}/exchanges/${x.id}/edit`}
                    className="-mx-2 flex justify-between gap-2 rounded-md px-2 py-1.5 text-xs tabular-nums text-muted hover:bg-paper"
                  >
                    <span>
                      {x.exchanged_on.slice(5).replace("-", ".")} · {x.kind === "prepaid" ? "충전카드" : "현금"}
                    </span>
                    <span>
                      {formatKrw(x.krw_amount)} → {formatAmount(x.foreign_amount, trip.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">충전·환전 기록이 없어요</p>
            <p className="text-xs text-muted">적어두면 실제 환율로 계산하고 잔액도 보여줘요.</p>
          </div>
          <Link
            href={addHref}
            className="flex h-11 shrink-0 items-center rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent-ink"
          >
            + 충전
          </Link>
        </div>
      )}
    </section>
  );
}

function TripSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="h-11" />
      <div className="h-[110px] animate-pulse rounded-[10px] bg-card" />
      <div className="h-[180px] animate-pulse rounded-[14px] bg-card" />
      <div className="h-[50px] animate-pulse rounded-xl bg-card" />
    </div>
  );
}
