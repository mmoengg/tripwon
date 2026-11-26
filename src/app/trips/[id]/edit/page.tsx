import { BackLink, PageTitle } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMyUserId, getTrip, getTripCounts } from "@/lib/trips";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TripForm } from "../../new/new-trip-form";
import { deleteTrip, updateTrip } from "../../actions";

export default function EditTripPage({ params }: PageProps<"/trips/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ id }) => <EditTrip id={id} />)}
      </Suspense>
    </main>
  );
}

async function EditTrip({ id }: { id: string }) {
  const [trip, counts, me] = await Promise.all([getTrip(id), getTripCounts(id), getMyUserId()]);
  if (!trip) notFound();
  if (trip.user_id !== me) {
    return (
      <>
        <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
        <p className="rounded-[14px] bg-card p-5 text-sm text-muted">여행 정보는 여행을 만든 사람만 수정할 수 있어요.</p>
      </>
    );
  }

  const lost = [counts.expenses && `지출 ${counts.expenses}건`, counts.exchanges && `환전 기록 ${counts.exchanges}건`]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle>여행 수정</PageTitle>
      <ResetOnLeave>
        <TripForm
          key={[trip.name, trip.rate_krw, trip.start_date, trip.end_date].join("|")}
          action={updateTrip.bind(null, trip.id)}
          initial={{
            name: trip.name,
            currency: trip.currency,
            rate_krw: String(trip.rate_krw),
            start_date: trip.start_date ?? "",
            end_date: trip.end_date ?? "",
          }}
        />
        <ConfirmDeleteButton
          label="이 여행 삭제"
          message={`${lost ? `${lost}도 함께 삭제돼요. ` : ""}되돌릴 수 없어요. 삭제할까요?`}
          action={deleteTrip.bind(null, trip.id)}
        />
      </ResetOnLeave>
    </>
  );
}
