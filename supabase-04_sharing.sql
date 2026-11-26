-- =========================================================
-- 여행 경비 앱 — 4단계 마이그레이션: 동행자 공유
--   · 여행 멤버(trip_members) + 초대 링크(invite_code)
--   · 권한: 지출은 멤버 누구나 추가 / 수정·삭제는 작성자 또는 여행 만든 사람
--           여행 정보 수정·삭제는 만든 사람만
--   · 지갑(충전·환전 평균 환율, 잔액)은 사람마다 따로
--   · 지출에 '낸 사람'(paid_by) — 정산 준비
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

-- ---------- 0. 뷰 먼저 내림 (아래에서 다시 만듦) ----------
drop view if exists public.expense_krw;
drop view if exists public.trip_wallet;

-- ---------- 1. 멤버 ----------
create table public.trip_members (
  trip_id       uuid not null references public.trips(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner','member')),
  display_name  text not null check (char_length(display_name) between 1 and 40),
  joined_at     timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on public.trip_members (user_id);

-- 표시 이름: 구글 이름 > 이메일 앞부분 (내부용, 직접 호출 불가)
create function public.user_display_name(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select left(coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(u.email, '@', 1), '')
  ), 40)
  from auth.users u where u.id = uid
$$;
revoke execute on function public.user_display_name(uuid) from public, anon, authenticated;

-- 기존 여행: 만든 사람을 owner 멤버로
insert into public.trip_members (trip_id, user_id, role, display_name)
select t.id, t.user_id, 'owner', coalesce(public.user_display_name(t.user_id), '나')
from public.trips t
on conflict do nothing;

-- 새 여행: 만든 사람을 owner 멤버로 자동 추가
create function public.add_trip_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trip_members (trip_id, user_id, role, display_name)
  values (new.id, new.user_id, 'owner', coalesce(public.user_display_name(new.user_id), '나'))
  on conflict do nothing;
  return new;
end $$;
revoke execute on function public.add_trip_owner() from public, anon, authenticated;
create trigger trips_add_owner after insert on public.trips
  for each row execute function public.add_trip_owner();

-- 권한 확인용 함수 (security definer: 정책끼리 서로 부르며 무한 반복하지 않게)
create function public.is_trip_member(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members m where m.trip_id = tid and m.user_id = (select auth.uid()))
$$;
create function public.is_trip_owner(tid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t where t.id = tid and t.user_id = (select auth.uid()))
$$;
create function public.is_user_in_trip(tid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trip_members m where m.trip_id = tid and m.user_id = uid)
$$;
revoke execute on function public.is_trip_member(uuid) from public, anon;
revoke execute on function public.is_trip_owner(uuid) from public, anon;
revoke execute on function public.is_user_in_trip(uuid, uuid) from public, anon;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;
grant execute on function public.is_user_in_trip(uuid, uuid) to authenticated;

alter table public.trip_members enable row level security;

create policy "members: read same trip" on public.trip_members
  for select to authenticated using (public.is_trip_member(trip_id));

-- 나가기(본인) 또는 내보내기(만든 사람). owner는 지울 수 없음 (여행을 지우면 같이 지워짐)
create policy "members: leave or remove" on public.trip_members
  for delete to authenticated using (
    role <> 'owner' and (user_id = (select auth.uid()) or public.is_trip_owner(trip_id))
  );

-- 본인 표시 이름만 바꿀 수 있음 (role은 못 바꾸게 컬럼 권한으로 막음)
create policy "members: rename self" on public.trip_members
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update on public.trip_members from anon, authenticated;
grant update (display_name) on public.trip_members to authenticated;
-- 멤버 추가는 join_trip() 함수로만

-- ---------- 2. 여행: 초대 코드 + 권한 ----------
alter table public.trips
  add column invite_code text unique check (invite_code is null or invite_code ~ '^[A-Za-z0-9_-]{16,64}$');

drop policy if exists "trips: owner all" on public.trips;
create policy "trips: members read" on public.trips
  for select to authenticated using (user_id = (select auth.uid()) or public.is_trip_member(id));
create policy "trips: create own" on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "trips: owner update" on public.trips
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trips: owner delete" on public.trips
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- 3. 지출: 낸 사람 + 권한 ----------
alter table public.expenses
  add column paid_by uuid references auth.users(id) on delete set null;
update public.expenses set paid_by = user_id where paid_by is null;
alter table public.expenses alter column paid_by set default auth.uid();

drop policy if exists "expenses: owner all" on public.expenses;
create policy "expenses: members read" on public.expenses
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "expenses: members add" on public.expenses
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and public.is_trip_member(trip_id)
    and (paid_by is null or public.is_user_in_trip(trip_id, paid_by))
  );
create policy "expenses: author or owner edits" on public.expenses
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_owner(trip_id))
  with check (
    public.is_trip_member(trip_id)
    and (paid_by is null or public.is_user_in_trip(trip_id, paid_by))
  );
create policy "expenses: author or owner deletes" on public.expenses
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_trip_owner(trip_id));

-- ---------- 4. 충전·환전: 사람마다 + 권한 ----------
drop policy if exists "exchanges: owner all" on public.exchanges;
create policy "exchanges: members read" on public.exchanges
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "exchanges: add own" on public.exchanges
  for insert to authenticated with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "exchanges: edit own" on public.exchanges
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "exchanges: delete own or owner" on public.exchanges
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_trip_owner(trip_id));

-- ---------- 5. 지갑: 여행 × 사람 ----------
create view public.trip_wallet
with (security_invoker = true) as
select
  m.trip_id,
  m.user_id,
  coalesce(x.krw, 0) as exchanged_krw,
  coalesce(x.fx, 0)  as exchanged_foreign,
  case when x.fx > 0 then x.krw / x.fx end as avg_rate,
  coalesce(s.spent, 0) as spent_foreign,          -- 이 사람이 충전카드·현금으로 낸 현지 돈
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
  where e.method in ('prepaid','cash') and e.currency = tt.currency
  group by e.trip_id, e.paid_by
) s on s.trip_id = m.trip_id and s.paid_by = m.user_id;

-- ---------- 6. 원화 환산: 낸 사람의 지갑 평균 환율 ----------
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

-- ---------- 7. 초대 링크용 함수 ----------
-- 참여 전 미리보기: 코드로 여행 이름·만든 사람만 확인
create function public.invite_preview(code text)
returns table (trip_id uuid, name text, owner_name text, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name,
    (select m.display_name from public.trip_members m where m.trip_id = t.id and m.role = 'owner'),
    public.is_trip_member(t.id)
  from public.trips t
  where code is not null and t.invite_code = code
$$;

-- 참여: 로그인한 사람을 멤버로 추가하고 여행 id 반환
create function public.join_trip(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  tid uuid;
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select t.id into tid from public.trips t where code is not null and t.invite_code = code;
  if tid is null then raise exception 'invalid_invite'; end if;
  insert into public.trip_members (trip_id, user_id, role, display_name)
  values (tid, uid, 'member', coalesce(public.user_display_name(uid), '동행자'))
  on conflict (trip_id, user_id) do nothing;
  return tid;
end $$;

revoke execute on function public.invite_preview(text) from public, anon;
revoke execute on function public.join_trip(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;
grant execute on function public.join_trip(text) to authenticated;

commit;
