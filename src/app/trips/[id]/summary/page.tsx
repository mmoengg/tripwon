import { BackLink, PageTitle } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExpenses, getMembers, getTrip, type ExpenseRow } from "@/lib/trips";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";
import { DOMESTIC_METHODS, PAYMENT_METHODS } from "@/lib/payment-methods";
import { formatKrw, formatTripRange } from "@/lib/format";

export default function SummaryPage({ params }: PageProps<"/trips/[id]/summary">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ id }) => <Summary id={id} />)}
      </Suspense>
    </main>
  );
}

type Row = { key: string; label: string; icon: boolean; krw: number; count: number };

// 같은 키끼리 원화 합계·건수를 모으고 큰 순으로 정렬. 0원 항목은 뺌
// icon: 카테고리별이면 선 아이콘 표시
function groupBy(
  expenses: ExpenseRow[],
  keyOf: (e: ExpenseRow) => string,
  meta: { value: string; label: string }[],
  icon = false,
): Row[] {
  const map = new Map<string, Row>();
  for (const m of meta) map.set(m.value, { key: m.value, label: m.label, icon, krw: 0, count: 0 });
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
  const [expenses, members] = await Promise.all([getExpenses(id), getMembers(id)]);

  const total = expenses.reduce((s, e) => s + e.amount_krw, 0);
  const local = expenses.filter((e) => e.paid_where === "local");
  const localTotal = local.reduce((s, e) => s + e.amount_krw, 0);
  const koreaTotal = total - localTotal;
  // 하루 평균은 현지 지출만: 항공·숙소 선결제까지 나누면 체감과 안 맞음
  const days = tripDays(trip.start_date, trip.end_date) ?? new Set(local.map((e) => e.spent_on)).size;
  const perDay = days > 0 ? localTotal / days : 0;
  const estimated = expenses.filter((e) => e.rate_source === "trip");

  const byCategory = groupBy(expenses, (e) => e.category, CATEGORIES, true);
  // 국내 여행은 카드/현금 두 가지로 묶음 (충전카드도 카드로)
  const domestic = trip.currency === "KRW";
  const byMethod = domestic
    ? groupBy(expenses, (e) => (e.method === "cash" ? "cash" : "credit"), [...DOMESTIC_METHODS])
    : groupBy(expenses, (e) => e.method, [...PAYMENT_METHODS]);
  // 여럿이 쓰는 여행: 낸 사람별 (정산 전 참고용)
  const byPayer =
    members.length > 1
      ? groupBy(expenses, (e) => e.paid_by ?? "", members.map((m) => ({ value: m.user_id, label: m.display_name })))
      : [];

  return (
    <>
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle sub={`${trip.name} · ${formatTripRange(trip.start_date, trip.end_date)}`}>요약</PageTitle>

      {expenses.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-chip px-6 py-12 text-center text-sm text-muted">
          지출을 적으면 여기에 요약이 나와요.
        </p>
      ) : (
        <>
          <section className="rounded-[14px] bg-card p-5 shadow-[0_1px_0_var(--color-line)]">
            <p className="text-sm text-muted">총 지출</p>
            <p className="mt-1 font-serif text-[32px] font-extrabold tracking-tight tabular-nums">{formatKrw(total)}</p>
            {trip.currency === "KRW" ? (
              // 국내 여행: 현지/선결제 구분이 없음
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <Stat label={`하루 평균 (${days}일)`} value={formatKrw(days > 0 ? total / days : 0)} />
                <Stat label="건수" value={`${expenses.length}건`} />
              </dl>
            ) : (
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                <Stat label="현지" value={formatKrw(localTotal)} />
                <Stat label="한국에서 미리" value={formatKrw(koreaTotal)} />
                <Stat label={`하루 평균 (${days}일)`} value={formatKrw(perDay)} />
              </dl>
            )}
          </section>

          {estimated.length > 0 && (
            <p className="-mt-3 text-xs text-muted">
              신용카드 등 {estimated.length}건은 여행 기본 환율로 계산한 예상 금액이 포함돼 있어요.
            </p>
          )}

          <BarList title="카테고리별" rows={byCategory} total={total} />
          <BarList title="결제 수단별" rows={byMethod} total={total} />
          {byPayer.length > 0 && <BarList title="낸 사람별" rows={byPayer} total={total} />}

          {/* Link 대신 a: 파일 다운로드라 미리 불러오기(prefetch)가 필요 없음 */}
          <a
            href={`/trips/${trip.id}/export`}
            download
            className="flex h-12 items-center justify-center rounded-xl border border-line text-sm font-medium hover:bg-paper"
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
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium tabular-nums">{value}</dd>
    </div>
  );
}

// 가로 막대 목록: 단일 색(크기만 표현), 금액·비율은 글자로 직접 표시 → 색·호버 없이도 읽힘
function BarList({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.krw), 1);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.krw / total) * 100) : 0;
          return (
            <li key={r.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {r.icon && <CategoryIcon category={r.key} size={24} round />}
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 text-xs text-muted">{r.count}건</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatKrw(r.krw)}
                  <span className="ml-1.5 inline-block w-9 text-right text-xs text-muted">{pct}%</span>
                </span>
              </div>
              {/* 막대 길이는 가장 큰 항목 기준 (작은 항목도 비교가 잘 보이게) */}
              <div className="h-2 rounded-full bg-line-soft" aria-hidden>
                <div className="h-2 rounded-full bg-accent" style={{ width: `${(r.krw / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
