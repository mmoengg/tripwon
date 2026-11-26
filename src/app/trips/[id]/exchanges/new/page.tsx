import { BackLink, PageTitle } from "@/components/page-header";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ExchangeForm } from "./exchange-form";
import { createExchange } from "../../../exchange-actions";

export default function NewExchangePage({ params }: PageProps<"/trips/[id]/exchanges/new">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
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
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle sub="하나머니 충전 내역이나 환전 영수증을 보고 그대로 옮겨 적으면 돼요.">충전 / 환전</PageTitle>
      <ResetOnLeave>
        <ExchangeForm action={createExchange.bind(null, trip.id)} currency={trip.currency} today={todayInSeoul()} />
      </ResetOnLeave>
    </>
  );
}
