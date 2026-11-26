import { BackLink, PageTitle } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExpenses, getMembers, getMyUserId, getSettlements, getTrip } from "@/lib/trips";
import { computeSettlement, POOL } from "@/lib/settlement";
import { formatKrw } from "@/lib/format";
import { MemberAvatar } from "@/components/member-avatar";
import { markDeposit, markSettled, undoSettlement } from "../../settle-actions";
import { DepositForm } from "./deposit-form";
import { SettleButton } from "./settle-button";

export default function SettlePage({ params }: PageProps<"/trips/[id]/settle">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ id }) => <Settle id={id} />)}
      </Suspense>
    </main>
  );
}

async function Settle({ id }: { id: string }) {
  const trip = await getTrip(id);
  if (!trip) notFound();
  const [expenses, members, records, me] = await Promise.all([
    getExpenses(id),
    getMembers(id),
    getSettlements(id),
    getMyUserId(),
  ]);
  const isOwner = trip.user_id === me;
  const { people, transfers, skipped, excludedByLeft, pool } = computeSettlement(expenses, records, members.map((m) => m.user_id));

  const idx = new Map(members.map((m, i) => [m.user_id, i]));
  const nameOf = (uid: string | null) =>
    !uid || uid === POOL ? "공금" : (members.find((m) => m.user_id === uid)?.display_name ?? "나간 동행자");
  // 동그라미: 공금은 우표색 '공'
  const Who = ({ uid, size }: { uid: string; size: number }) =>
    uid === POOL ? (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-stamp-ink bg-stamp font-semibold text-ink ring-2 ring-paper"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        공
      </span>
    ) : (
      <MemberAvatar name={nameOf(uid)} index={idx.get(uid) ?? 0} size={size} />
    );
  const estimated = expenses.filter((e) => e.rate_source === "trip").length;
  const when = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  // 사람 카드 순서: 멤버 순서, 그 뒤에 나간 동행자
  const sortedPeople = [...people].sort((a, b) => (idx.get(a.userId) ?? 99) - (idx.get(b.userId) ?? 99));

  // 공금 (가상 지갑): 총무는 현금을 들고 있는 사람일 뿐
  const treasurer = trip.treasurer_id;
  const deposits = records.filter((r) => r.kind === "deposit");
  const settles = records.filter((r) => r.kind !== "deposit");
  const canRecordAnyDeposit = isOwner || me === treasurer;
  const depositors = canRecordAnyDeposit ? members : members.filter((m) => m.user_id === me);
  const memberSet = new Set(members.map((m) => m.user_id));
  const depositOf = new Map<string, number>();
  for (const r of deposits)
    if (r.from_user && memberSet.has(r.from_user)) depositOf.set(r.from_user, (depositOf.get(r.from_user) ?? 0) + r.amount_krw);

  return (
    <>
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle>정산</PageTitle>

      {members.length < 2 ? (
        <p className="rounded-[14px] border border-dashed border-chip p-5 text-sm text-muted">
          동행자를 초대하면 누가 누구에게 얼마를 보내면 되는지 계산해 드려요.
        </p>
      ) : (
        <>
          {/* 공금 */}
          {(treasurer || pool) && (
            <section className="flex flex-col gap-3 rounded-[14px] border border-dashed border-stamp bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-stamp-ink">공금</h2>
                <span className="text-xs text-muted">{treasurer ? `총무 ${nameOf(treasurer)}가 보관` : "총무 없음"}</span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">걷은 돈</dt>
                  <dd className="font-semibold tabular-nums">{formatKrw(pool?.inflow ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">공금 결제</dt>
                  <dd className="font-semibold tabular-nums">{formatKrw(pool?.spent ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">남은 공금</dt>
                  <dd className={`font-semibold tabular-nums ${(pool?.cash ?? 0) < 0 ? "text-red-700" : ""}`}>
                    {formatKrw(pool?.cash ?? 0)}
                  </dd>
                </div>
              </dl>
              {pool && pool.outflow > 0 && (
                <p className="-mt-1 text-xs text-muted">공금에서 돌려준 {formatKrw(pool.outflow)}이 빠진 금액이에요.</p>
              )}
              {treasurer && depositors.length > 0 && (
                <DepositForm members={depositors} defaultFrom={depositors[0].user_id} action={markDeposit.bind(null, trip.id)} />
              )}
              {deposits.length > 0 && (
                <ul className="flex flex-col divide-y divide-line-soft border-t border-line-soft">
                  {deposits.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {nameOf(r.from_user)} 입금 · <b className="tabular-nums">{formatKrw(r.amount_krw)}</b>
                        <span className="ml-1 text-xs text-muted">{when.format(new Date(r.created_at))}</span>
                      </span>
                      {(isOwner || r.created_by === me) && (
                        <SettleButton variant="ghost" label="취소" action={undoSettlement.bind(null, trip.id, r.id)} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted">
                총무 본인 회비도 입금으로 적어주세요. 정산할 때 남은 공금은 &lsquo;공금 → 누구&rsquo;로 돌려주고, 모자라면 &lsquo;누구 → 공금&rsquo;으로 채워요.
              </p>
            </section>
          )}

          {/* 보낼 돈 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">보낼 돈</h2>
            {transfers.length === 0 ? (
              <p className="rounded-[14px] bg-card p-5 text-center text-sm">
                <span className="font-serif text-lg font-extrabold">정산 끝!</span>
                <br />
                <span className="text-muted">더 보낼 돈이 없어요.</span>
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft rounded-[14px] bg-card">
                {transfers.map((t) => {
                  const withPool = t.from === POOL || t.to === POOL;
                  const canMark = isOwner || me === t.from || me === t.to || (withPool && me === treasurer);
                  return (
                    <li key={`${t.from}-${t.to}`} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="flex -space-x-1.5">
                        <Who uid={t.from} size={30} />
                        <Who uid={t.to} size={30} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <b>{nameOf(t.from)}</b> → <b>{nameOf(t.to)}</b>
                        </p>
                        <p className="font-serif text-lg font-extrabold tabular-nums">{formatKrw(t.amount)}</p>
                        {withPool && treasurer && (
                          <p className="truncate text-xs text-muted">
                            {t.from === POOL ? `총무 ${nameOf(treasurer)}가 공금에서 건네줘요` : `총무 ${nameOf(treasurer)}에게 줘요`}
                          </p>
                        )}
                      </div>
                      {canMark && (
                        <SettleButton label="송금 완료" action={markSettled.bind(null, trip.id, t.from, t.to, t.amount)} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-muted">
              송금 횟수가 가장 적게 계산했어요. 일부만 보냈다면 보낸 금액만큼 완료로 표시돼요.
              {estimated > 0 && ` 신용카드 예상 금액 ${estimated}건이 포함돼 있어서, 명세서 금액을 넣으면 정산액이 조금 바뀔 수 있어요.`}
              {skipped > 0 && ` 낸 사람이 없는 지출 ${skipped}건은 빠졌어요.`}
              {excludedByLeft > 0 && ` 나간 동행자가 낸 지출 ${excludedByLeft}건은 빠졌어요(나간 사람 몫은 남은 사람끼리 다시 나눠요).`}
            </p>
          </section>

          {/* 사람별 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">사람별</h2>
            <ul className="flex flex-col divide-y divide-line-soft rounded-[14px] bg-card">
              {sortedPeople.map((p) => (
                <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
                  <MemberAvatar name={nameOf(p.userId)} index={idx.get(p.userId) ?? 0} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {nameOf(p.userId)}
                      {p.userId === me && <span className="ml-1 text-xs font-normal text-muted">(나)</span>}
                    </p>
                    <p className="text-xs tabular-nums text-muted">
                      낸 돈 {formatKrw(p.paid)}
                      {depositOf.has(p.userId) && ` · 회비 ${formatKrw(depositOf.get(p.userId)!)}`} · 내 몫 {formatKrw(p.owed)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    {p.remaining === 0 ? (
                      <p className="text-sm text-muted">정산 완료</p>
                    ) : (
                      <>
                        <p className={`text-[15px] font-semibold ${p.remaining > 0 ? "text-accent-ink" : "text-red-700"}`}>
                          {p.remaining > 0 ? "+" : "−"}
                          {formatKrw(Math.abs(p.remaining))}
                        </p>
                        <p className="text-xs text-muted">{p.remaining > 0 ? "받을 돈" : "줄 돈"}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 송금 완료 기록 */}
          {settles.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">송금 완료 기록</h2>
              <ul className="flex flex-col divide-y divide-line-soft rounded-[14px] border border-dashed border-chip px-4">
                {settles.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">
                        {nameOf(r.from_user)} → {nameOf(r.to_user)} · <b className="tabular-nums">{formatKrw(r.amount_krw)}</b>
                      </p>
                      <p className="text-xs text-muted">
                        {nameOf(r.created_by)}님이 표시 · {when.format(new Date(r.created_at))}
                      </p>
                    </div>
                    {(isOwner || r.created_by === me) && (
                      <SettleButton variant="ghost" label="취소" action={undoSettlement.bind(null, trip.id, r.id)} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
