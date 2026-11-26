-- =========================================================
-- 여행 경비 앱 — 11단계 마이그레이션: 공금을 '가상 지갑'으로 (10 다음에 실행)
--   · 공금 지출: 낸 사람 = 공금 (paid_by = null, from_pool = true). 총무가 낸 걸로 치지 않음
--   · 송금/입금 기록에서 비어 있는 쪽(null) = 공금
--       입금: 나 → 공금 (to_user = null)   돌려받기: 공금 → 나 (from_user = null)
--   · 총무 = 공금 현금을 들고 있는 사람 (표시용 + 공금 현금 지출의 환율은 총무 지갑 기준)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;
drop view if exists public.trip_wallet;

-- ---------- 1. 지출: 공금 지출은 낸 사람 없음(=공금) ----------
create or replace function public.set_pool_payer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tr uuid;
begin
  if new.from_pool then
    -- 새로 공금으로 바꿀 때만 공금이 켜져 있는지(총무가 있는지) 확인
    if tg_op = 'INSERT' or not old.from_pool then
      select t.treasurer_id into tr from public.trips t where t.id = new.trip_id;
      if tr is null then
        raise exception 'set a treasurer before recording pool expenses' using errcode = '23514';
      end if;
    end if;
    new.paid_by := null;
  end if;
  return new;
end $$;

-- 기존 공금 지출: 낸 사람(총무) → 공금 (수정 표시가 찍히지 않게 트리거 잠시 끔)
alter table public.expenses disable trigger expenses_stamp_update;
alter table public.expenses disable trigger expenses_a_set_pool_payer;
update public.expenses set paid_by = null where from_pool;
alter table public.expenses enable trigger expenses_stamp_update;
alter table public.expenses enable trigger expenses_a_set_pool_payer;

-- ---------- 2. 송금 기록: 비어 있는 쪽 = 공금 ----------
alter table public.settlements alter column from_user drop not null;
alter table public.settlements alter column to_user drop not null;
update public.settlements set to_user = null where kind = 'deposit';
alter table public.settlements
  add constraint settlements_one_side check (from_user is not null or to_user is not null),
  add constraint settlements_deposit_to_pool check (kind <> 'deposit' or (to_user is null and from_user is not null));

create function public.is_trip_treasurer(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t where t.id = tid and t.treasurer_id = (select auth.uid()))
$$;
revoke execute on function public.is_trip_treasurer(uuid) from public, anon;
grant execute on function public.is_trip_treasurer(uuid) to authenticated;

-- 기록: 주고받은 당사자 · 여행 만든 사람 · (공금이 끼면) 총무
drop policy "settlements: party adds" on public.settlements;
create policy "settlements: party adds" on public.settlements
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and (from_user is null or public.is_user_in_trip(trip_id, from_user))
    and (to_user is null or public.is_user_in_trip(trip_id, to_user))
    and (
      coalesce((select auth.uid()) = from_user, false)
      or coalesce((select auth.uid()) = to_user, false)
      or public.is_trip_owner(trip_id)
      or ((from_user is null or to_user is null) and public.is_trip_treasurer(trip_id))
    )
  );

-- ---------- 3. 지갑 뷰: 공금 현금 지출은 총무 지갑에서 빠짐 (환전도 총무가 기록) ----------
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
  select e.trip_id, coalesce(e.paid_by, case when e.from_pool then tt.treasurer_id end) as wallet_user, sum(e.amount) as spent
  from public.expenses e
  join public.trips tt on tt.id = e.trip_id
  where e.deleted_at is null
    and e.method in ('prepaid','cash') and e.currency = tt.currency
  group by 1, 2
) s on s.trip_id = m.trip_id and s.wallet_user = m.user_id;

-- ---------- 4. 원화 환산 뷰 (공금 지출은 총무 지갑 환율) ----------
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
left join public.trip_wallet w on w.trip_id = e.trip_id
  and w.user_id = coalesce(e.paid_by, case when e.from_pool then t.treasurer_id end)
where e.deleted_at is null;

commit;
