-- =========================================================
-- 여행 경비 앱 — 8단계 마이그레이션: 내보낸·나간 동행자의 지출도 정리 가능하게
--   문제: 수정 정책이 매번 '낸 사람이 지금 멤버인지' 검사 → 나간 사람이 낸 지출은
--         만든 사람도 삭제(논리삭제)·수정을 못 함
--   수정: 낸 사람 검사는 '새로 쓰거나 낸 사람을 바꿀 때만' 트리거에서 (나눌 사람 검사와 같은 방식)
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run (한 번만)
-- =========================================================
begin;

-- 1) 수정 정책: 낸 사람 조건 제거 (여행 멤버만 수정 가능한 건 그대로)
drop policy if exists "expenses: author or owner edits" on public.expenses;
create policy "expenses: author or owner edits" on public.expenses
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_owner(trip_id))
  with check (public.is_trip_member(trip_id));

-- 2) 낸 사람 검사: 새로 쓸 때 또는 낸 사람을 바꿀 때만
create function public.check_expense_payer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.paid_by is not null
     and (tg_op = 'INSERT' or new.paid_by is distinct from old.paid_by)
     and not public.is_user_in_trip(new.trip_id, new.paid_by) then
    raise exception 'paid_by must be a trip member' using errcode = '23514';
  end if;
  return new;
end $$;
revoke execute on function public.check_expense_payer() from public, anon, authenticated;

create trigger expenses_check_payer before insert or update on public.expenses
  for each row execute function public.check_expense_payer();

commit;
