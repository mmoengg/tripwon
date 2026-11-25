-- =========================================================
-- 여행 경비 기록 앱 — 1단계: 테이블 + RLS
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run
-- =========================================================

-- ---------- 1. 여행 (trips) ----------
create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 50),
  currency    text not null default 'JPY'
                check (currency ~ '^[A-Z]{3}$'),          -- ISO 코드: JPY, USD, THB …
  rate_krw    numeric(12,4) not null check (rate_krw > 0), -- 1 현지통화 = ?원 (직접 수정 가능)
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index trips_user_idx on public.trips (user_id, created_at desc);

-- ---------- 2. 지출 (expenses) ----------
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  user_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  category    text not null check (category in (
                'food','transit','lodging','shopping','sightseeing',
                'snack','etc','flight','ticket','transport_booking')),
  amount      numeric(14,2) not null check (amount >= 0),
  -- 현지 통화로 적었는지, 한국에서 원화로 미리 결제했는지
  currency    text not null check (currency ~ '^[A-Z]{3}$'),
  paid_where  text not null default 'local' check (paid_where in ('local','korea')),
  method      text not null default 'card'  check (method in ('card','cash')),
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

create index expenses_trip_idx on public.expenses (trip_id, spent_on desc);

-- ---------- 3. RLS: 내 데이터만 보고/쓰기 ----------
alter table public.trips    enable row level security;
alter table public.expenses enable row level security;

create policy "trips: owner all" on public.trips
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 지출은 '내 여행'에만 넣을 수 있게 trip 소유도 함께 확인
create policy "expenses: owner all" on public.expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = (select auth.uid())
    )
  );

-- ---------- 4. 요약용 뷰 (원화 환산 포함) ----------
-- KRW로 적은 지출은 1:1, 그 외는 여행의 rate_krw 적용
create view public.expense_krw
with (security_invoker = true) as   -- RLS가 뷰에도 그대로 적용됨
select
  e.*,
  round(e.amount * case when e.currency = 'KRW' then 1 else t.rate_krw end) as amount_krw
from public.expenses e
join public.trips t on t.id = e.trip_id;
