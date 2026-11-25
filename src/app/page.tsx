import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

// 3단계에서 여행 목록으로 교체 예정 — 지금은 로그인 확인용
async function Greeting() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = claims?.user_metadata as { name?: string; full_name?: string } | undefined;
  const name = meta?.name ?? meta?.full_name ?? claims?.email ?? "여행자";
  return (
    <p className="text-lg">
      안녕하세요, <b>{name}</b>님 👋
    </p>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 text-center">
      <Suspense fallback={<p className="text-lg text-neutral-300">불러오는 중…</p>}>
        <Greeting />
      </Suspense>
      <p className="text-sm text-neutral-500">로그인 연결 완료! 다음 단계에서 여행 목록이 여기 생겨요.</p>
      <form action="/auth/signout" method="post">
        <button className="text-sm text-neutral-500 underline">로그아웃</button>
      </form>
    </main>
  );
}
