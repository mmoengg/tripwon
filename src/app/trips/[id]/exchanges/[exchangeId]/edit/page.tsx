import { BackLink, PageTitle } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getExchange, getTrip } from "@/lib/trips";
import { todayInSeoul } from "@/lib/format";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ExchangeForm } from "../../new/exchange-form";
import { deleteExchange, updateExchange } from "../../../../exchange-actions";

export default function EditExchangePage({ params }: PageProps<"/trips/[id]/exchanges/[exchangeId]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ id, exchangeId }) => <EditExchange id={id} exchangeId={exchangeId} />)}
      </Suspense>
    </main>
  );
}

async function EditExchange({ id, exchangeId }: { id: string; exchangeId: string }) {
  const [trip, x] = await Promise.all([getTrip(id), getExchange(id, exchangeId)]);
  if (!trip || !x) notFound();

  return (
    <>
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle>충전 / 환전 수정</PageTitle>
      <ResetOnLeave>
        <ExchangeForm
          key={[x.kind, x.exchanged_on, x.krw_amount, x.foreign_amount].join("|")}
          action={updateExchange.bind(null, trip.id, x.id)}
          currency={trip.currency}
          today={todayInSeoul()}
          initial={{
            kind: x.kind,
            exchanged_on: x.exchanged_on,
            krw_amount: String(x.krw_amount),
            foreign_amount: String(x.foreign_amount),
          }}
        />
        <ConfirmDeleteButton
          label="이 기록 삭제"
          message="삭제하면 평균 환율과 잔액이 다시 계산돼요. 삭제할까요?"
          action={deleteExchange.bind(null, trip.id, x.id)}
        />
      </ResetOnLeave>
    </>
  );
}
