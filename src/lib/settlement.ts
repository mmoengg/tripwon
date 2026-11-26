// 정산 계산 (원화, 정수). DB 없이 돌아가는 순수 함수라 테스트하기 쉬움

export type SettleExpense = {
  amount_krw: number;
  paid_by: string | null;
  split_with: string[] | null;
  split_all?: boolean; // true면 정산 시점 멤버 전원 (늦게 들어온 사람 포함)
  from_pool?: boolean; // 공금으로 냄 → 낸 쪽은 '공금' 지갑
};

// from_user / to_user가 null이면 그쪽은 공금 (입금: 나 → 공금, 돌려받기: 공금 → 나)
export type SettleRecord = { from_user: string | null; to_user: string | null; amount_krw: number };

// 공금을 정산에서 한 명처럼 다루기 위한 id (송금 목록에 그대로 나옴)
export const POOL = "__pool__";

export type PoolBalance = {
  spent: number; // 공금 결제
  inflow: number; // 공금에 들어온 돈 (입금 + 공금으로 보낸 송금)
  outflow: number; // 공금에서 나간 돈 (돌려준 돈)
  cash: number; // 지금 공금에 남은 돈 = inflow − spent − outflow
};

export type PersonBalance = {
  userId: string;
  paid: number; // 낸 돈
  owed: number; // 내 몫
  net: number; // 낸 돈 − 내 몫 (+면 받을 돈, −면 줄 돈)
  remaining: number; // 송금 완료를 반영한 남은 금액
};

export type Transfer = { from: string; to: string; amount: number };

// 규칙: 지금 멤버끼리만 정산
//  · 나간 사람이 낸 지출은 빠짐 (excludedByLeft로 셈)
//  · 나간 사람의 몫은 남은 참여자끼리 다시 나눔
//  · '전원' 지출은 지금 멤버 전원 (늦게 들어온 사람 포함)
//  · 나간 사람과 주고받은 송금 기록은 빠짐
//  · 공금은 '가상 멤버': 공금 결제는 공금이 낸 돈, 입금은 나 → 공금 송금.
//    남은 공금은 공금이 '줄 돈'이 돼서 송금 목록에 '공금 → 누구'로 나옴
export function computeSettlement(expenses: SettleExpense[], records: SettleRecord[], memberIds: string[]) {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const members = new Set(memberIds);
  const poolUsed = expenses.some((e) => e.from_pool) || records.some((r) => !r.from_user || !r.to_user);
  const nodes = new Set(memberIds); // 정산 참여자 (사람 + 공금)
  if (poolUsed) nodes.add(POOL);
  const nodeOf = (u: string | null) => u ?? POOL;
  let skipped = 0;
  let excludedByLeft = 0;

  for (const e of expenses) {
    const amount = Math.round(e.amount_krw);
    if (amount <= 0) continue;
    const payer = e.from_pool ? POOL : e.paid_by;
    if (!payer) {
      skipped++;
      continue;
    }
    if (!nodes.has(payer)) {
      excludedByLeft++;
      continue;
    }
    // 정렬: 자투리 원을 항상 같은 사람에게
    const base_ = e.split_all ? memberIds : (e.split_with ?? []).filter((u) => members.has(u));
    const people = [...new Set(base_)].sort();
    if (people.length === 0) {
      excludedByLeft++; // 고른 사람이 모두 나감
      continue;
    }
    add(paid, payer, amount);
    // 1/N 하고 남는 원 단위 자투리는 앞사람부터 1원씩 → 몫의 합 = 금액 (정확히)
    const base = Math.floor(amount / people.length);
    let rem = amount - base * people.length;
    for (const p of people) {
      add(owed, p, base + (rem > 0 ? 1 : 0));
      if (rem > 0) rem--;
    }
  }

  const remainingMap = new Map<string, number>();
  for (const id of nodes) remainingMap.set(id, (paid.get(id) ?? 0) - (owed.get(id) ?? 0));
  // 송금 완료: 보낸 쪽은 줄 돈이 줄고(+), 받은 쪽은 받을 돈이 줄어듦(−)
  const pool: PoolBalance = { spent: paid.get(POOL) ?? 0, inflow: 0, outflow: 0, cash: 0 };
  for (const r of records) {
    const from = nodeOf(r.from_user);
    const to = nodeOf(r.to_user);
    if (!nodes.has(from) || !nodes.has(to) || from === to) continue; // 나간 사람과의 기록은 제외
    const amount = Math.round(r.amount_krw);
    add(remainingMap, from, amount);
    add(remainingMap, to, -amount);
    if (to === POOL) pool.inflow += amount;
    if (from === POOL) pool.outflow += amount;
  }
  pool.cash = pool.inflow - pool.spent - pool.outflow;

  const balances: PersonBalance[] = [...nodes].map((id) => ({
    userId: id,
    paid: paid.get(id) ?? 0,
    owed: owed.get(id) ?? 0,
    net: (paid.get(id) ?? 0) - (owed.get(id) ?? 0),
    remaining: remainingMap.get(id) ?? 0,
  }));

  // 최소 송금: 가장 많이 받을 사람 ↔ 가장 많이 줄 사람부터 짝짓기
  const creditors = balances.filter((p) => p.remaining > 0).map((p) => ({ id: p.userId, left: p.remaining }));
  const debtors = balances.filter((p) => p.remaining < 0).map((p) => ({ id: p.userId, left: -p.remaining }));
  creditors.sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
  debtors.sort((a, b) => b.left - a.left || a.id.localeCompare(b.id));
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    if (amount > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }

  const people = balances.filter((p) => p.userId !== POOL);
  return { people, transfers, skipped, excludedByLeft, pool: poolUsed ? pool : null };
}
