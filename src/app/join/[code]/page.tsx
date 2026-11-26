import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { joinTrip } from "@/app/trips/member-actions";
import { JoinButton } from "./join-button";

// 초대 링크로 들어오는 곳. 로그인 안 했으면 proxy가 /login?next=/join/... 으로 보냈다가 돌아옴
export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-[14px] bg-card" />}>
        {params.then(({ code }) => <Join code={code} />)}
      </Suspense>
    </main>
  );
}

type Preview = { trip_id: string; name: string; owner_name: string | null; already_member: boolean };

async function Join({ code }: { code: string }) {
  const valid = /^[A-Za-z0-9_-]{16,64}$/.test(code);
  let preview: Preview | null = null;
  if (valid) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("invite_preview", { code });
    preview = ((data as Preview[] | null) ?? [])[0] ?? null;
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-4 rounded-[14px] bg-card p-6 text-center">
        <p className="font-serif text-xl font-extrabold">링크를 열 수 없어요</p>
        <p className="text-sm text-muted">초대 링크가 바뀌었거나 꺼졌어요. 여행을 만든 사람에게 새 링크를 받아주세요.</p>
        <Link href="/" className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-white">
          내 여행으로
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="airmail rounded-[10px] p-1.5">
        <div className="flex flex-col gap-2 rounded-md bg-card px-6 py-7">
          <span className="text-xs tracking-[2px] text-muted">INVITATION · 초대장</span>
          <p className="text-[15px] text-muted">
            <b className="text-ink">{preview.owner_name ?? "동행자"}</b>님이 초대했어요
          </p>
          <h1 className="font-serif text-[28px] font-extrabold tracking-tight break-keep">{preview.name}</h1>
          <p className="text-sm text-muted">함께 쓴 돈을 같이 기록해요. 지갑(충전·잔액)은 각자 따로예요.</p>
        </div>
      </div>
      {preview.already_member ? (
        <Link
          href={`/trips/${preview.trip_id}`}
          className="flex h-12 items-center justify-center rounded-xl bg-accent font-semibold text-white"
        >
          이미 참여 중이에요 · 여행 보기
        </Link>
      ) : (
        <JoinButton action={joinTrip.bind(null, code)} />
      )}
    </>
  );
}
