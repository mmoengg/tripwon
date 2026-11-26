// 정산 계산 (원화, 정수). DB 없이 돌아가는 순수 함수라 테스트하기 쉬움

export type SettleExpense = {
  amount_krw: number;
  paid_by: string | null;
  split_with: string[] | null;
  split_all?: boolean; // true면 정산 시점 멤버 전원 (늦게 들어온 사람 포함)
};

export type SettleRecord = { from_user: string; to_user: string; amount_krw: number };

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
export function computeSettlement(expenses: SettleExpense[], records: SettleRecord[], memberIds: string[]) {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const members = new Set(memberIds);
  let skipped = 0;
  let excludedByLeft = 0;

  for (const e of expenses) {
    const amount = Math.round(e.amount_krw);
    if (amount <= 0) continue;
    if (!e.paid_by) {
      skipped++;
      continue;
    }
    if (!members.has(e.paid_by)) {
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
    add(paid, e.paid_by, amount);
    // 1/N 하고 남는 원 단위 자투리는 앞사람부터 1원씩 → 몫의 합 = 금액 (정확히)
    const base = Math.floor(amount / people.length);
    let rem = amount - base * people.length;
    for (const p of people) {
      add(owed, p, base + (rem > 0 ? 1 : 0));
      if (rem > 0) rem--;
    }
  }

  const ids = new Set(memberIds); // 지금 멤버만
  const remainingMap = new Map<string, number>();
  for (const id of ids) remainingMap.set(id, (paid.get(id) ?? 0) - (owed.get(id) ?? 0));
  // 송금 완료: 보낸 사람은 줄 돈이 줄고(+), 받은 사람은 받을 돈이 줄어듦(−)
  for (const r of records) {
    if (!members.has(r.from_user) || !members.has(r.to_user)) continue; // 나간 사람과의 기록은 제외
    add(remainingMap, r.from_user, Math.round(r.amount_krw));
    add(remainingMap, r.to_user, -Math.round(r.amount_krw));
  }

  const people: PersonBalance[] = [...ids].map((id) => ({
    userId: id,
    paid: paid.get(id) ?? 0,
    owed: owed.get(id) ?? 0,
    net: (paid.get(id) ?? 0) - (owed.get(id) ?? 0),
    remaining: remainingMap.get(id) ?? 0,
  }));

  // 최소 송금: 가장 많이 받을 사람 ↔ 가장 많이 줄 사람부터 짝짓기
  const creditors = people.filter((p) => p.remaining > 0).map((p) => ({ id: p.userId, left: p.remaining }));
  const debtors = people.filter((p) => p.remaining < 0).map((p) => ({ id: p.userId, left: -p.remaining }));
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

  return { people, transfers, skipped, excludedByLeft };
}
