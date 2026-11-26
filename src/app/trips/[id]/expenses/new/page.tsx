import { ResetOnLeave } from "@/components/reset-on-leave";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMembers, getMyUserId, getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { createExpense } from "../../../expense-actions";

export default function NewExpensePage({ params }: PageProps<"/trips/[id]/expenses/new">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-line-soft" />}>
        {params.then(({ id }) => <NewExpense id={id} />)}
      </Suspense>
    </main>
  );
}

async function NewExpense({ id }: { id: string }) {
  const [trip, members, me] = await Promise.all([getTrip(id), getMembers(id), getMyUserId()]);
  if (!trip) notFound();
  return (
    <>
      <Link href={`/trips/${trip.id}`} className="text-sm text-muted">← {trip.name}</Link>
      <h1 className="text-2xl font-semibold">지출 추가</h1>
      <ResetOnLeave>
        <ExpenseForm action={createExpense.bind(null, trip.id)} tripCurrency={trip.currency} today={todayInSeoul()} members={members} me={me} />
      </ResetOnLeave>
    </>
  );
}
