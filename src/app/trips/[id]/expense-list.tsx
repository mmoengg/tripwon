"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExpenseRow, Member } from "@/lib/trips";
import { CATEGORIES, categoryInfo } from "@/lib/categories";
import { paymentLabel } from "@/lib/payment-methods";
import { formatAmount, formatKrw, formatShortDay, tripDayLabel } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";

type Props = {
  tripId: string;
  startDate: string | null;
  domestic: boolean;
  expenses: ExpenseRow[];
  me: string | null;
  isOwner: boolean;
  members: Member[];
};

// 카테고리 탭 + 날짜별 묶음 리스트. 탭을 바꾸면 날짜별 합계도 그 카테고리 기준
export function ExpenseList({ tripId, startDate, domestic, expenses, me, isOwner, members }: Props) {
  const shared = members.length > 1;
  const nameOf = (uid: string | null) => members.find((m) => m.user_id === uid)?.display_name ?? "나간 동행자";
  const [tab, setTab] = useState<string>("all");

  // 실제로 쓴 카테고리만 탭으로 (정해진 순서대로)
  const used = CATEGORIES.filter((c) => expenses.some((e) => e.category === c.value));
  const shown = tab === "all" ? expenses : expenses.filter((e) => e.category === tab);

  // 날짜별로 묶기 (이미 최신순 정렬)
  const byDay = new Map<string, ExpenseRow[]>();
  for (const e of shown) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e]);

  if (expenses.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-chip px-6 py-12 text-center">
        <p className="font-medium">아직 지출이 없어요</p>
        <p className="mt-1 text-sm text-muted">항공권이나 숙소처럼 미리 낸 것부터 적어도 좋아요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {used.length > 1 && (
        <div role="tablist" aria-label="카테고리" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {[{ value: "all", label: "전체" }, ...used].map((c) => {
            const active = tab === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(c.value)}
                className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] ${
                  active ? "bg-ink font-medium text-white" : "border border-chip bg-card text-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {[...byDay].map(([day, items]) => {
        const dayLabel = tripDayLabel(day, startDate);
        return (
          <section key={day} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-0.5">
              <h2 className="font-serif text-[17px] font-extrabold">
                {dayLabel ?? formatShortDay(day)}
                {dayLabel && <span className="ml-1.5 font-sans text-[13px] font-normal text-muted">{formatShortDay(day)}</span>}
              </h2>
              <span className="text-[13px] tabular-nums text-muted">
                {formatKrw(items.reduce((s, e) => s + e.amount_krw, 0))}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-line-soft rounded-[14px] bg-card">
              {items.map((e) => {
                // 수정·삭제: 적은 사람 또는 여행을 만든 사람만 (DB 권한과 같은 규칙)
                const canEdit = isOwner || e.user_id === me;
                const rowClass = "flex items-center gap-3 px-3.5 py-3 first:rounded-t-[14px] last:rounded-b-[14px]";
                const body = (
                  <>
                    <CategoryIcon category={e.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{e.title}</p>
                      <p className="text-xs text-muted">
                        {shared &&
                          (e.from_pool ? (
                            <span className="font-semibold text-stamp-ink">공금 · </span>
                          ) : (
                            <span className="font-medium text-ink/80">{nameOf(e.paid_by)} · </span>
                          ))}
                        {shared && !e.split_all && e.split_with && (
                          <span className="mr-1 rounded border border-chip px-1 text-[11px]">
                            {e.split_with.length === 1 ? "개인" : `${e.split_with.length}명`}
                          </span>
                        )}
                        {categoryInfo(e.category).label} · {paymentLabel(e.method, domestic)}
                        {e.paid_where === "korea" && " · 한국에서"}
                      </p>
                      {e.memo && <p className="mt-0.5 truncate text-xs text-muted/80">{e.memo}</p>}
                      {/* 적은 사람이 아닌 사람(여행을 만든 사람)이 고쳤으면 표시 */}
                      {e.updated_by && e.updated_by !== e.user_id && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-stamp-ink">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                          {nameOf(e.updated_by)}님이 수정함
                        </p>
                      )}
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-[15px] font-semibold">
                        {e.rate_source === "trip" && (
                          <span className="mr-1 rounded border border-chip px-1 py-px align-[1px] text-[11px] font-medium text-muted">
                            예상
                          </span>
                        )}
                        {formatKrw(e.amount_krw)}
                      </p>
                      {e.currency !== "KRW" && <p className="text-xs text-muted">{formatAmount(e.amount, e.currency)}</p>}
                    </div>
                  </>
                );
                return (
                  <li key={e.id}>
                    {canEdit ? (
                      <Link href={`/trips/${tripId}/expenses/${e.id}/edit`} className={`${rowClass} hover:bg-paper/50`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
