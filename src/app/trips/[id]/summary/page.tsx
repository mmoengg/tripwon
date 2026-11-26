import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExpenses, getTrip, type ExpenseRow } from "@/lib/trips";
import { CATEGORIES } from "@/lib/categories";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import { formatKrw, formatTripRange } from "@/lib/format";

export default function SummaryPage({ params }: PageProps<"/trips/[id]/summary">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-neutral-100" />}>
        {params.then(({ id }) => <Summary id={id} />)}
      </Suspense>
    </main>
  );
}

type Row = { key: string; label: string; emoji?: string; krw: number; count: number };

// 같은 키끼리 원화 합계·건수를 모으고 큰 순으로 정렬. 0원 항목은 뺌
function groupBy(expenses: ExpenseRow[], keyOf: (e: ExpenseRow) => string, meta: { value: string; label: string; emoji?: string }[]): Row[] {
  const map = new Map<string, Row>();
  for (const m of meta) map.set(m.value, { key: m.value, label: m.label, emoji: m.emoji, krw: 0, count: 0 });
  for (const e of expenses) {
    const r = map.get(keyOf(e));
    if (!r) continue;
    r.krw += e.amount_krw;
    r.count += 1;
  }
  return [...map.values()].filter((r) => r.count > 0).sort((a, b) => b.krw - a.krw);
}

// 시작~종료일 포함 일수
function tripDays(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

async function Summary({ id }: { id: string }) {
  const trip = await getTrip(id);
  if (!trip) notFound();
  const expenses = await getExpenses(id);

  const total = expenses.reduce((s, e) => s + e.amount_krw, 0);
  const local = expenses.filter((e) => e.paid_where === "local");
  const localTotal = local.reduce((s, e) => s + e.amount_krw, 0);
  const koreaTotal = total - localTotal;
  // 하루 평균은 현지 지출만: 항공·숙소 선결제까지 나누면 체감과 안 맞음
  const days = tripDays(trip.start_date, trip.end_date) ?? new Set(local.map((e) => e.spent_on)).size;
  const perDay = days > 0 ? localTotal / days : 0;
  const estimated = expenses.filter((e) => e.rate_source === "trip");

  const byCategory = groupBy(expenses, (e) => e.category, CATEGORIES);
  const byMethod = groupBy(expenses, (e) => e.method, [...PAYMENT_METHODS]);

  return (
    <>
      <Link href={`/trips/${trip.id}`} className="text-sm text-neutral-500">← {trip.name}</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">요약</h1>
        <p className="text-sm text-neutral-500">{trip.name} · {formatTripRange(trip.start_date, trip.end_date)}</p>
      </header>

      {expenses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center text-sm text-neutral-500">
          지출을 적으면 여기에 요약이 나와요.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-neutral-900 p-5 text-white">
            <p className="text-sm text-neutral-400">총 지출</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{formatKrw(total)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-700 pt-4 text-sm">
              <Stat label="현지" value={formatKrw(localTotal)} />
              <Stat label="한국에서 미리" value={formatKrw(koreaTotal)} />
              <Stat label={`하루 평균 (${days}일)`} value={formatKrw(perDay)} />
            </dl>
          </section>

          {estimated.length > 0 && (
            <p className="-mt-3 text-xs text-neutral-500">
              신용카드 등 {estimated.length}건은 여행 기본 환율로 계산한 예상 금액이 포함돼 있어요.
            </p>
          )}

          <BarList title="카테고리별" rows={byCategory} total={total} />
          <BarList title="결제 수단별" rows={byMethod} total={total} />

          {/* Link 대신 a: 파일 다운로드라 미리 불러오기(prefetch)가 필요 없음 */}
          <a
            href={`/trips/${trip.id}/export`}
            download
            className="flex h-12 items-center justify-center rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
          >
            CSV로 내보내기 (엑셀에서 열기)
          </a>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium tabular-nums">{value}</dd>
    </div>
  );
}

// 가로 막대 목록: 단일 색(크기만 표현), 금액·비율은 글자로 직접 표시 → 색·호버 없이도 읽힘
function BarList({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.krw), 1);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-neutral-700">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.krw / total) * 100) : 0;
          return (
            <li key={r.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {r.emoji && <span aria-hidden className="mr-1">{r.emoji}</span>}
                  {r.label}
                  <span className="ml-1 text-xs text-neutral-400">{r.count}건</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatKrw(r.krw)}
                  <span className="ml-1.5 inline-block w-9 text-right text-xs text-neutral-500">{pct}%</span>
                </span>
              </div>
              {/* 막대 길이는 가장 큰 항목 기준 (작은 항목도 비교가 잘 보이게) */}
              <div className="h-2 rounded-full bg-neutral-100" aria-hidden>
                <div className="h-2 rounded-full bg-neutral-800" style={{ width: `${(r.krw / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
