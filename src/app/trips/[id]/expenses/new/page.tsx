import { BackLink, PageTitle } from "@/components/page-header";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMembers, getMyUserId, getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ExpenseForm } from "./expense-form";
import { createExpense } from "../../../expense-actions";

export default function NewExpensePage({ params }: PageProps<"/trips/[id]/expenses/new">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
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
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle>지출 추가</PageTitle>
      <ResetOnLeave>
        <ExpenseForm action={createExpense.bind(null, trip.id)} tripCurrency={trip.currency} today={todayInSeoul()} members={members} me={me} />
      </ResetOnLeave>
    </>
  );
}
