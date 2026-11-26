import { ResetOnLeave } from "@/components/reset-on-leave";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExpense, getMembers, getMyUserId, getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ExpenseForm } from "../../new/expense-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { deleteExpense, updateExpense } from "../../../../expense-actions";

export default function EditExpensePage({ params }: PageProps<"/trips/[id]/expenses/[expenseId]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-line-soft" />}>
        {params.then(({ id, expenseId }) => <EditExpense id={id} expenseId={expenseId} />)}
      </Suspense>
    </main>
  );
}

async function EditExpense({ id, expenseId }: { id: string; expenseId: string }) {
  const [trip, expense, members, me] = await Promise.all([
    getTrip(id),
    getExpense(id, expenseId),
    getMembers(id),
    getMyUserId(),
  ]);
  if (!trip || !expense) notFound();

  // 수정·삭제는 적은 사람 또는 여행을 만든 사람만 (DB 권한과 같은 규칙)
  if (expense.user_id !== me && trip.user_id !== me) {
    const author = members.find((m) => m.user_id === expense.user_id)?.display_name ?? "다른 동행자";
    return (
      <>
        <Link href={`/trips/${trip.id}`} className="text-sm text-muted">← {trip.name}</Link>
        <p className="rounded-[14px] bg-card p-5 text-sm text-muted">
          <b className="text-ink">{author}</b>님이 적은 지출이에요. 적은 사람이나 여행을 만든 사람만 수정할 수 있어요.
        </p>
      </>
    );
  }

  return (
    <>
      <Link href={`/trips/${trip.id}`} className="text-sm text-muted">← {trip.name}</Link>
      <h1 className="text-2xl font-semibold">지출 수정</h1>
      <ResetOnLeave>
      <ExpenseForm
        action={updateExpense.bind(null, trip.id, expense.id)}
        tripCurrency={trip.currency}
        today={todayInSeoul()}
        initial={{
          title: expense.title,
          category: expense.category,
          amount: String(Number(expense.amount)),
          currency: expense.currency,
          paid_where: expense.paid_where,
          method: expense.method,
          spent_on: expense.spent_on,
          amount_krw_actual: expense.amount_krw_actual == null ? "" : String(Number(expense.amount_krw_actual)),
          memo: expense.memo ?? "",
          paid_by: expense.paid_by ?? "",
        }}
        members={members}
        me={me}
      />
      <ConfirmDeleteButton
        label="이 지출 삭제"
        message="삭제하면 되돌릴 수 없어요. 삭제할까요?"
        action={deleteExpense.bind(null, trip.id, expense.id)}
      />
      </ResetOnLeave>
    </>
  );
}
