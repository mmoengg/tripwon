import { BackLink, PageTitle } from "@/components/page-header";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { TripForm } from "./new-trip-form";
import { createTrip } from "../actions";

export default function NewTripPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <BackLink href="/">내 여행</BackLink>
      <PageTitle sub="엽서 한 장 쓰듯, 여행 이름과 통화만 정하면 돼요.">새 여행</PageTitle>
      <ResetOnLeave>
        <TripForm action={createTrip} />
      </ResetOnLeave>
    </main>
  );
}
