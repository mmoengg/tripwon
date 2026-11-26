-- =========================================================
-- 여행 경비 앱 — 3단계 마이그레이션: 지출 메모
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

alter table public.expenses
  add column memo text check (memo is null or char_length(memo) <= 500);

-- 뷰는 만들 때의 e.* 컬럼으로 고정되므로, memo가 보이게 다시 만듦 (내용은 02와 동일)
drop view if exists public.expense_krw;

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
