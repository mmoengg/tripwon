-- =========================================================
-- 여행 경비 앱 — 2단계 마이그레이션: 환전 기록 + 결제 수단 3종
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

-- ---------- 0. 뷰가 expenses 컬럼에 의존하므로 먼저 내림 (아래에서 다시 만듦) ----------
drop view if exists public.expense_krw;

-- ---------- 1. 결제 수단: card/cash → prepaid(충전카드) / cash(현금) / credit(신용카드) ----------
alter table public.expenses drop constraint if exists expenses_method_check;
update public.expenses set method = 'credit' where method = 'card';   -- 기존 '카드'는 신용카드로 간주
alter table public.expenses
  alter column method set default 'prepaid',
  add constraint expenses_method_check check (method in ('prepaid','cash','credit'));

-- 신용카드 명세서에 찍힌 실제 원화 금액 (있으면 이 값을 우선 사용, 없으면 예상치)
alter table public.expenses
  add column amount_krw_actual numeric(14,0) check (amount_krw_actual is null or amount_krw_actual >= 0);

-- ---------- 2. 환전 기록 (충전카드 충전 + 현금 환전 = '환전한 돈' 한 주머니) ----------
create table public.exchanges (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  user_id         uuid not null default auth.uid()
                    references auth.users(id) on delete cascade,
  kind            text not null default 'prepaid' check (kind in ('prepaid','cash')), -- 표시용
  exchanged_on    date not null default current_date,
  krw_amount      numeric(14,0) not null check (krw_amount > 0),     -- 낸 원화
  foreign_amount  numeric(14,2) not null check (foreign_amount > 0), -- 받은 현지 돈 (여행 통화)
  created_at      timestamptz not null default now()
);

create index exchanges_trip_idx on public.exchanges (trip_id, exchanged_on desc);

alter table public.exchanges enable row level security;

create policy "exchanges: owner all" on public.exchanges
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = (select auth.uid())
    )
  );

-- ---------- 3. 여행별 주머니 요약: 평균 환율 + 잔액 ----------
create view public.trip_wallet
with (security_invoker = true) as
select
  t.id as trip_id,
  coalesce(x.krw, 0)     as exchanged_krw,
  coalesce(x.fx, 0) as exchanged_foreign,
  case when x.fx > 0 then x.krw / x.fx end as avg_rate,   -- 환전 기록 없으면 null
  coalesce(s.spent, 0)   as spent_foreign,                          -- 충전카드+현금으로 쓴 현지 돈
  coalesce(x.fx, 0) - coalesce(s.spent, 0) as balance_foreign
from public.trips t
left join (
  select trip_id, sum(krw_amount) as krw, sum(foreign_amount) as fx
  from public.exchanges group by trip_id
) x on x.trip_id = t.id
left join (
  select e.trip_id, sum(e.amount) as spent
  from public.expenses e
  join public.trips tt on tt.id = e.trip_id
  where e.method in ('prepaid','cash') and e.currency = tt.currency
  group by e.trip_id
) s on s.trip_id = t.id;

-- ---------- 4. 지출 원화 환산 뷰 (다시 만듦) ----------
-- 우선순위: 원화로 적음 > 명세서 실제 금액 > (충전카드·현금) 환전 평균 > 여행 기본 환율(예상)
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
left join public.trip_wallet w on w.trip_id = e.trip_id;

commit;
