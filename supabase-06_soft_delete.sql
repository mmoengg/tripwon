-- =========================================================
-- 여행 경비 앱 — 6단계 마이그레이션: 지출 논리삭제
--   · 지출은 실제로 지우지 않고 deleted_at(시각)·deleted_by(사람)만 기록 → 되살리기 가능
--   · 실제 삭제(DELETE)는 아무도 못 함 (여행을 지우면 cascade로만 같이 지워짐)
--   · 충전·환전 기록 삭제는 본인 것만 (만든 사람도 남의 기록은 못 지움)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;
drop view if exists public.trip_wallet;

alter table public.expenses
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;

-- 살아 있는 지출만 빠르게 조회
create index expenses_alive_idx on public.expenses (trip_id, spent_on desc) where deleted_at is null;

-- 수정 기록 트리거 확장: 삭제·되살리기는 deleted_*에, 일반 수정은 updated_*에 기록
-- (모든 기록 값은 DB가 채움 → 클라이언트가 보낸 값은 무시)
create or replace function public.stamp_expense_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if new.deleted_at is not null then
      new.deleted_at := now();
      new.deleted_by := (select auth.uid());
    else
      new.deleted_by := null;               -- 되살리기
    end if;
    new.updated_at := old.updated_at;       -- 삭제·되살리기는 '수정'으로 치지 않음
    new.updated_by := old.updated_by;
  else
    new.updated_at := now();
    new.updated_by := (select auth.uid());
    new.deleted_by := old.deleted_by;       -- 일반 수정으로 삭제자를 바꾸지 못하게
  end if;
  return new;
end $$;

-- 실제 삭제 금지: 삭제 정책을 없앰 (RLS에서 정책이 없으면 거부)
drop policy if exists "expenses: author or owner deletes" on public.expenses;

-- 충전·환전: 본인 기록만 삭제
drop policy if exists "exchanges: delete own or owner" on public.exchanges;
create policy "exchanges: delete own" on public.exchanges
  for delete to authenticated using (user_id = (select auth.uid()));

-- 지갑: 삭제된 지출은 쓴 돈에서 제외 (나머지는 04와 동일)
create view public.trip_wallet
with (security_invoker = true) as
select
  m.trip_id,
  m.user_id,
  coalesce(x.krw, 0) as exchanged_krw,
  coalesce(x.fx, 0)  as exchanged_foreign,
  case when x.fx > 0 then x.krw / x.fx end as avg_rate,
  coalesce(s.spent, 0) as spent_foreign,
  coalesce(x.fx, 0) - coalesce(s.spent, 0) as balance_foreign
from public.trip_members m
left join (
  select trip_id, user_id, sum(krw_amount) as krw, sum(foreign_amount) as fx
  from public.exchanges group by trip_id, user_id
) x on x.trip_id = m.trip_id and x.user_id = m.user_id
left join (
  select e.trip_id, e.paid_by, sum(e.amount) as spent
  from public.expenses e
  join public.trips tt on tt.id = e.trip_id
  where e.deleted_at is null
    and e.method in ('prepaid','cash') and e.currency = tt.currency
  group by e.trip_id, e.paid_by
) s on s.trip_id = m.trip_id and s.paid_by = m.user_id;

-- 원화 환산: 살아 있는 지출만 (나머지는 05와 동일)
create view public.expense_krw
with (security_invoker = true) as
select
  e.*,
  case
    when e.currency = 'KRW' then 'krw'
    when e.amount_krw_actual is not null then 'actual'
    when e.method in ('prepaid','cash') and w.avg_rate is not null then 'exchange'
    else 'trip'
  end as rate_source,
  round(case
    when e.currency = 'KRW' then e.amount
    when e.amount_krw_actual is not null then e.amount_krw_actual
    when e.method in ('prepaid','cash') and w.avg_rate is not null then e.amount * w.avg_rate
    else e.amount * t.rate_krw
  end) as amount_krw
from public.expenses e
join public.trips t on t.id = e.trip_id
left join public.trip_wallet w on w.trip_id = e.trip_id and w.user_id = e.paid_by
where e.deleted_at is null;

commit;
