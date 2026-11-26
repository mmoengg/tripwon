import { ResetOnLeave } from "@/components/reset-on-leave";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ExchangeForm } from "./exchange-form";
import { createExchange } from "../../../exchange-actions";

export default function NewExchangePage({ params }: PageProps<"/trips/[id]/exchanges/new">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-neutral-100" />}>
        {params.then(({ id }) => <NewExchange id={id} />)}
      </Suspense>
    </main>
  );
}

async function NewExchange({ id }: { id: string }) {
  const trip = await getTrip(id);
  if (!trip) notFound();
  return (
    <>
      <Link href={`/trips/${trip.id}`} className="text-sm text-neutral-500">← {trip.name}</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">충전 / 환전</h1>
        <p className="text-sm text-neutral-500">하나머니 충전 내역이나 환전 영수증을 보고 그대로 옮겨 적으면 돼요.</p>
      </div>
      <ResetOnLeave>
        <ExchangeForm action={createExchange.bind(null, trip.id)} currency={trip.currency} today={todayInSeoul()} />
      </ResetOnLeave>
    </>
  );
}
