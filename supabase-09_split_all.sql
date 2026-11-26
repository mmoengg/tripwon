-- =========================================================
-- 여행 경비 앱 — 9단계 마이그레이션: '전원' 나누기
--   · split_all = true  → 정산할 때 그 시점 멤버 전원 (늦게 들어온 사람 포함)
--   · split_all = false → split_with에 고른 사람만
--   · 기존 지출: 나눌 사람이 지금 멤버 전원을 포함하면 '전원'으로
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;

alter table public.expenses add column split_all boolean not null default true;

update public.expenses e
set split_all = coalesce(e.split_with @> (
  select array_agg(m.user_id) from public.trip_members m where m.trip_id = e.trip_id
), true);

-- 나눌 사람 트리거: '전원'이면 split_with는 지금 멤버로 채워 둠(참고용), 고른 경우만 검사
create or replace function public.check_expense_split() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.split_all then
    if tg_op = 'INSERT' or new.split_all is distinct from old.split_all or new.split_with is null then
      select array_agg(m.user_id order by m.joined_at) into new.split_with
      from public.trip_members m where m.trip_id = new.trip_id;
    end if;
    return new;
  end if;
  if new.split_with is null then
    raise exception 'split_with required when split_all is false' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' or new.split_with is distinct from old.split_with or new.split_all is distinct from old.split_all then
    if not public.all_users_in_trip(new.trip_id, new.split_with) then
      raise exception 'split_with must be non-empty trip members' using errcode = '23514';
    end if;
    select array_agg(distinct u) into new.split_with from unnest(new.split_with) u;
  end if;
  return new;
end $$;

-- 원화 환산 뷰 다시 만들기 (07과 동일, split_all이 e.*에 포함되게)
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
