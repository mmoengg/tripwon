-- =========================================================
-- 여행 경비 앱 — 10단계 마이그레이션: 공금 (총무 방식)
--   · 여행에 총무(treasurer_id) — 공금은 '총무가 모두를 대신해 들고 있는 돈'
--   · 지출 from_pool = true → 낸 사람은 DB가 총무로 맞춤 (화면엔 '공금')
--   · 공금 입금은 settlements에 kind = 'deposit'으로 (정산 계산은 송금과 똑같이 반영)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;

-- ---------- 1. 총무 ----------
alter table public.trips
  add column treasurer_id uuid references auth.users(id) on delete set null;

-- 총무는 이 여행 멤버여야 함 (바꿀 때만 검사)
create function public.check_trip_treasurer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.treasurer_id is not null
     and (tg_op = 'INSERT' or new.treasurer_id is distinct from old.treasurer_id)
     and not public.is_user_in_trip(new.id, new.treasurer_id) then
    raise exception 'treasurer must be a trip member' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function public.check_trip_treasurer() from public, anon, authenticated;
create trigger trips_check_treasurer before update on public.trips
  for each row execute function public.check_trip_treasurer();

-- 총무가 나가거나 내보내지면 총무 자리를 비움 (멤버 삭제는 RLS 권한으로 이미 제한됨)
create function public.clear_treasurer_on_leave() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.trips set treasurer_id = null
  where id = old.trip_id and treasurer_id = old.user_id;
  return old;
end $$;
revoke execute on function public.clear_treasurer_on_leave() from public, anon, authenticated;
create trigger trip_members_clear_treasurer after delete on public.trip_members
  for each row execute function public.clear_treasurer_on_leave();

-- ---------- 2. 지출: 공금으로 냄 ----------
alter table public.expenses add column from_pool boolean not null default false;

-- 공금 지출은 낸 사람 = 총무. 총무가 없으면 공금으로 기록 불가
-- (낸 사람 검사 트리거 expenses_check_payer보다 먼저 돌도록 이름을 앞 순서로)
create function public.set_pool_payer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tr uuid;
begin
  if new.from_pool and (tg_op = 'INSERT' or new.from_pool is distinct from old.from_pool or new.paid_by is distinct from old.paid_by) then
    select t.treasurer_id into tr from public.trips t where t.id = new.trip_id;
    if tr is null then
      raise exception 'set a treasurer before recording pool expenses' using errcode = '23514';
    end if;
    new.paid_by := tr;
  end if;
  return new;
end $$;
revoke execute on function public.set_pool_payer() from public, anon, authenticated;
create trigger expenses_a_set_pool_payer before insert or update on public.expenses
  for each row execute function public.set_pool_payer();

-- ---------- 3. 입금 기록 ----------
alter table public.settlements
  add column kind text not null default 'settle' check (kind in ('settle', 'deposit'));

-- ---------- 4. 원화 환산 뷰 다시 만들기 (09와 동일, from_pool이 e.*에 포함되게) ----------
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
