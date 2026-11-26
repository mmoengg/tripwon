import { ResetOnLeave } from "@/components/reset-on-leave";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExpense, getTrip } from "@/lib/trips";
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
  const [trip, expense] = await Promise.all([getTrip(id), getExpense(id, expenseId)]);
  if (!trip || !expense) notFound();

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
        }}
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
