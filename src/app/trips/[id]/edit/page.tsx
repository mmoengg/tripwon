import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTrip, getTripCounts } from "@/lib/trips";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { TripForm } from "../../new/new-trip-form";
import { deleteTrip, updateTrip } from "../../actions";

export default function EditTripPage({ params }: PageProps<"/trips/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-neutral-100" />}>
        {params.then(({ id }) => <EditTrip id={id} />)}
      </Suspense>
    </main>
  );
}

async function EditTrip({ id }: { id: string }) {
  const [trip, counts] = await Promise.all([getTrip(id), getTripCounts(id)]);
  if (!trip) notFound();

  const lost = [counts.expenses && `지출 ${counts.expenses}건`, counts.exchanges && `환전 기록 ${counts.exchanges}건`]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Link href={`/trips/${trip.id}`} className="text-sm text-neutral-500">← {trip.name}</Link>
      <h1 className="text-2xl font-semibold">여행 수정</h1>
      <ResetOnLeave>
        <TripForm
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
