-- =========================================================
-- 여행 경비 앱 — 12단계 마이그레이션: 공금 방식 고르기 (11 다음에 실행)
--   · trips.pool_mode: 'off'(안 씀) | 'separate'(따로 관리, 정산 제외) | 'settle'(회비로 정산)
--   · pool_funds: '따로 관리' 공금에 넣은 돈 (곗돈 등). 원화 또는 여행 통화(외화)
--       외화는 krw_amount(그 돈을 만드는 데 든 원화)를 적으면 그 환율, 비우면 여행 기본 환율
--   · '따로 관리'의 외화 공금 지출은 공금 환율로 환산, 총무 지갑에서 빠지지 않음
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;
drop view if exists public.trip_wallet;

-- ---------- 1. 공금 방식 ----------
alter table public.trips
  add column pool_mode text not null default 'off' check (pool_mode in ('off', 'separate', 'settle'));

-- 기존 여행: 총무가 있거나 공금 기록이 있으면 '회비로 정산'(11과 같은 동작)
update public.trips t set pool_mode = 'settle'
where t.treasurer_id is not null
   or exists (select 1 from public.expenses e where e.trip_id = t.id and e.from_pool)
   or exists (select 1 from public.settlements s where s.trip_id = t.id and (s.from_user is null or s.to_user is null));

-- 새로 공금 지출로 바꿀 때: 공금을 쓰는 여행이어야 함 (총무는 이제 선택)
create or replace function public.set_pool_payer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  mode text;
begin
  if new.from_pool then
    if tg_op = 'INSERT' or not old.from_pool then
      select t.pool_mode into mode from public.trips t where t.id = new.trip_id;
      if mode is distinct from 'separate' and mode is distinct from 'settle' then
        raise exception 'turn on the shared pool before recording pool expenses' using errcode = '23514';
      end if;
    end if;
    new.paid_by := null;
  end if;
  return new;
end $$;

-- ---------- 2. 따로 관리 공금에 넣은 돈 ----------
create table public.pool_funds (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  currency    text not null,
  amount      numeric(14,2) not null check (amount > 0),
  krw_amount  numeric(14,0) check (krw_amount is null or krw_amount > 0), -- 외화일 때만, 선택
  memo        text check (memo is null or char_length(memo) <= 50),
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index pool_funds_trip_idx on public.pool_funds (trip_id, created_at);

-- 통화는 원화 또는 그 여행 통화만. 원화면 krw_amount는 비움
create function public.check_pool_fund() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cur text;
begin
  select t.currency into cur from public.trips t where t.id = new.trip_id;
  if new.currency <> 'KRW' and new.currency is distinct from cur then
    raise exception 'pool fund currency must be KRW or the trip currency' using errcode = '23514';
  end if;
  if new.currency = 'KRW' then
    new.krw_amount := null;
  end if;
  return new;
end $$;
revoke execute on function public.check_pool_fund() from public, anon, authenticated;
create trigger pool_funds_check before insert or update on public.pool_funds
  for each row execute function public.check_pool_fund();

alter table public.pool_funds enable row level security;
create policy "pool_funds: members read" on public.pool_funds
  for select to authenticated using (public.is_trip_member(trip_id));
-- 기록: 여행 만든 사람 · 총무
create policy "pool_funds: owner or treasurer adds" on public.pool_funds
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and (public.is_trip_owner(trip_id) or public.is_trip_treasurer(trip_id))
  );
-- 삭제: 기록한 사람 · 여행 만든 사람
create policy "pool_funds: author or owner deletes" on public.pool_funds
  for delete to authenticated using (created_by = (select auth.uid()) or public.is_trip_owner(trip_id));

-- ---------- 3. 지갑 뷰: 공금 현금 지출은 '회비로 정산'일 때만 총무 지갑에서 빠짐 ----------
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
  select e.trip_id,
         coalesce(e.paid_by, case when e.from_pool and tt.pool_mode = 'settle' then tt.treasurer_id end) as wallet_user,
         sum(e.amount) as spent
  from public.expenses e
  join public.trips tt on tt.id = e.trip_id
  where e.deleted_at is null
    and e.method in ('prepaid','cash') and e.currency = tt.currency
  group by 1, 2
) s on s.trip_id = m.trip_id and s.wallet_user = m.user_id;

-- ---------- 4. 원화 환산 뷰 ----------
--   따로 관리 공금의 외화 지출: 공금 외화 환율 (없으면 여행 기본 환율)
--   회비로 정산 공금의 외화 지출: 총무 지갑 환율 (11과 같음)
create view public.expense_krw
with (security_invoker = true) as
select
  e.*,
  case
    when e.currency = 'KRW' then 'krw'
    when e.amount_krw_actual is not null then 'actual'
    when e.method in ('prepaid','cash') and coalesce(pr.rate, w.avg_rate) is not null then 'exchange'
    else 'trip'
  end as rate_source,
  round(case
    when e.currency = 'KRW' then e.amount
    when e.amount_krw_actual is not null then e.amount_krw_actual
    when e.method in ('prepaid','cash') and coalesce(pr.rate, w.avg_rate) is not null then e.amount * coalesce(pr.rate, w.avg_rate)
    else e.amount * t.rate_krw
  end) as amount_krw
from public.expenses e
join public.trips t on t.id = e.trip_id
left join public.trip_wallet w on w.trip_id = e.trip_id
  and w.user_id = coalesce(e.paid_by, case when e.from_pool and t.pool_mode = 'settle' then t.treasurer_id end)
left join lateral (
  select sum(coalesce(f.krw_amount, f.amount * t.rate_krw)) / sum(f.amount) as rate
  from public.pool_funds f
  where f.trip_id = e.trip_id and f.currency = t.currency and f.currency <> 'KRW'
  having sum(f.amount) > 0
) pr on e.from_pool and t.pool_mode = 'separate'
where e.deleted_at is null;

commit;
