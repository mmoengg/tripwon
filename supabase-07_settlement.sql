-- =========================================================
-- 여행 경비 앱 — 7단계 마이그레이션: 정산
--   · 지출마다 '나눌 사람'(split_with). 기존 지출은 지금 멤버 전원으로 채움
--   · 송금 완료 기록(settlements) — 남은 정산 금액에서 빠짐, 취소 가능
--   · 정산 금액 계산은 앱에서 (원화 기준)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

drop view if exists public.expense_krw;

-- ---------- 1. 지출: 나눌 사람 ----------
alter table public.expenses add column split_with uuid[];

update public.expenses e
set split_with = (select array_agg(m.user_id order by m.joined_at) from public.trip_members m where m.trip_id = e.trip_id)
where e.split_with is null;

-- 나눌 사람이 비어 있지 않고, 모두 이 여행 멤버인지 확인 (새로 쓰거나 바꿀 때만)
create function public.all_users_in_trip(tid uuid, uids uuid[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(array_length(uids, 1), 0) > 0
     and not exists (
       select 1 from unnest(uids) u
       where not exists (select 1 from public.trip_members m where m.trip_id = tid and m.user_id = u)
     )
$$;
revoke execute on function public.all_users_in_trip(uuid, uuid[]) from public, anon;
grant execute on function public.all_users_in_trip(uuid, uuid[]) to authenticated;

-- 안 보내면 지금 멤버 전원, 보냈으면 검사 (나간 사람이 들어 있는 예전 지출은 split_with를 안 바꾸는 한 그대로 둠)
create function public.check_expense_split() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.split_with is null then
    select array_agg(m.user_id order by m.joined_at) into new.split_with
    from public.trip_members m where m.trip_id = new.trip_id;
  end if;
  if tg_op = 'INSERT' or new.split_with is distinct from old.split_with then
    if not public.all_users_in_trip(new.trip_id, new.split_with) then
      raise exception 'split_with must be non-empty trip members' using errcode = '23514';
    end if;
    -- 중복 제거
    select array_agg(distinct u) into new.split_with from unnest(new.split_with) u;
  end if;
  return new;
end $$;
revoke execute on function public.check_expense_split() from public, anon, authenticated;
create trigger expenses_check_split before insert or update on public.expenses
  for each row execute function public.check_expense_split();

-- ---------- 2. 송금 완료 기록 ----------
create table public.settlements (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  from_user   uuid not null references auth.users(id) on delete cascade,  -- 보낸 사람
  to_user     uuid not null references auth.users(id) on delete cascade,  -- 받은 사람
  amount_krw  numeric(14,0) not null check (amount_krw > 0),
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (from_user <> to_user)
);
create index settlements_trip_idx on public.settlements (trip_id, created_at desc);

alter table public.settlements enable row level security;

create policy "settlements: members read" on public.settlements
  for select to authenticated using (public.is_trip_member(trip_id));
-- 보낸 사람·받은 사람·여행 만든 사람이 기록
create policy "settlements: party adds" on public.settlements
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and public.is_user_in_trip(trip_id, from_user)
    and public.is_user_in_trip(trip_id, to_user)
    and ((select auth.uid()) in (from_user, to_user) or public.is_trip_owner(trip_id))
  );
-- 취소: 기록한 사람 또는 여행 만든 사람
create policy "settlements: undo" on public.settlements
  for delete to authenticated using (created_by = (select auth.uid()) or public.is_trip_owner(trip_id));

-- ---------- 3. 원화 환산 뷰 다시 만들기 (06과 동일, split_with가 e.*에 포함되게) ----------
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
