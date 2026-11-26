import { BackLink, PageTitle } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMembers, getMyUserId, getTrip } from "@/lib/trips";
import { MemberAvatar } from "@/components/member-avatar";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ResetOnLeave } from "@/components/reset-on-leave";
import { createInvite, disableInvite, leaveTrip, removeMember, renameMe } from "../../member-actions";
import { InviteBox } from "./invite-box";
import { RemoveMemberButton } from "./remove-member-button";
import { RenameForm } from "./rename-form";

export default function MembersPage({ params }: PageProps<"/trips/[id]/members">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-6 pb-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ id }) => <Members id={id} />)}
      </Suspense>
    </main>
  );
}

async function Members({ id }: { id: string }) {
  const [trip, members, me] = await Promise.all([getTrip(id), getMembers(id), getMyUserId()]);
  if (!trip) notFound();
  const isOwner = trip.user_id === me;
  const myName = members.find((m) => m.user_id === me)?.display_name ?? "";

  return (
    <>
      <BackLink href={`/trips/${trip.id}`}>{trip.name}</BackLink>
      <PageTitle>함께 가는 사람</PageTitle>

      <ul className="flex flex-col divide-y divide-line-soft rounded-[14px] bg-card">
        {members.map((m, i) => (
          <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
            <MemberAvatar name={m.display_name} index={i} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">
                {m.display_name}
                {m.user_id === me && <span className="ml-1 text-xs font-normal text-muted">(나)</span>}
              </p>
              <p className="text-xs text-muted">{m.role === "owner" ? "만든 사람" : "동행자"}</p>
            </div>
            {isOwner && m.role !== "owner" && (
              <RemoveMemberButton name={m.display_name} action={removeMember.bind(null, trip.id, m.user_id)} />
            )}
          </li>
        ))}
      </ul>

      {isOwner ? (
        <InviteBox
          code={trip.invite_code}
          tripName={trip.name}
          create={createInvite.bind(null, trip.id)}
          disable={disableInvite.bind(null, trip.id)}
        />
      ) : (
        <p className="rounded-[14px] border border-dashed border-chip p-4 text-sm text-muted">
          초대 링크는 여행을 만든 사람이 보낼 수 있어요.
        </p>
      )}

      <ResetOnLeave>
        <RenameForm action={renameMe.bind(null, trip.id)} defaultName={myName} />
      </ResetOnLeave>

      {!isOwner && (
        <ConfirmDeleteButton
          label="여행에서 나가기"
          message="나가면 이 여행이 목록에서 사라져요. 내가 적은 지출은 여행에 남아요. 나갈까요?"
          action={leaveTrip.bind(null, trip.id)}
        />
      )}
    </>
  );
}
