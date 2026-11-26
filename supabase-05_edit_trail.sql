-- =========================================================
-- 여행 경비 앱 — 5단계 마이그레이션: 지출 수정 기록
--   여행을 만든 사람은 동행자 지출도 고칠 수 있으므로, 누가 마지막으로 고쳤는지 남김
--   (앱이 보내는 값이 아니라 DB 트리거가 기록 → 속일 수 없음)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

alter table public.expenses
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users(id) on delete set null;

-- 수정될 때마다 시각과 수정한 사람을 기록 (클라이언트가 보낸 값은 덮어씀)
create function public.stamp_expense_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end $$;
revoke execute on function public.stamp_expense_update() from public, anon, authenticated;

create trigger expenses_stamp_update before update on public.expenses
  for each row execute function public.stamp_expense_update();

-- 뷰는 만들 때의 e.* 컬럼으로 고정되므로 다시 만듦 (내용은 04와 동일)
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
left join public.trip_wallet w on w.trip_id = e.trip_id and w.user_id = e.paid_by;

commit;
